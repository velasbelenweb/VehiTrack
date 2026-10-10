// ================================================================
//  VEHITRACK · Edge Function "admin" (panel de superadmin)
//  ----------------------------------------------------------------
//  TODA petición se valida en el servidor: JWT válido + el usuario
//  debe existir en la tabla `admins`. Sin eso responde 403.
//  Usa la llave service_role, por eso NUNCA se llama sin esa
//  verificación.
//
//  Acciones (body: { action, ...params }):
//    resumen            KPIs y series de los últimos 14 días
//    problemas          lista de problemas detectados automáticamente
//    usuarios           usuarios con saldo, consultas y recargas
//    consultas          últimas consultas (filtros: placa, user_id, solo_problemas)
//    consulta_detalle   informe completo de una consulta {id}
//    recargas           pagos/recargas (filtro: estado)
//    eventos            registro de eventos (filtro: nivel)
//    acreditar          suma saldo a un usuario {user_id, monto, motivo}   (auditado)
//    aprobar_recarga    aprueba una recarga pendiente {id}                 (auditado)
//
//  Desplegar:  supabase functions deploy admin --no-verify-jwt
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { registrarEvento } from "../_shared/eventos.ts";
import { estadoProveedor, UMBRAL_CONSULTAS } from "../_shared/saldos.ts";

const ORIGENES = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://vehitrack.app,https://www.vehitrack.app").split(",").map((s) => s.trim());
function corsPara(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0],
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const DIA_MS = 86_400_000;
const bogota = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600_000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const CORS = corsPara(req);
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  let autorizado = false;
  try {
    // 1) Autenticación
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: ud, error: ue } = await anon.auth.getUser();
    if (ue || !ud?.user) return json({ error: "no_autenticado" }, 401);
    const adminId = ud.user.id;

    // 2) Autorización: debe estar en la tabla admins
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: esAdmin, error: admErr } = await db.from("admins").select("user_id,puede_abonar").eq("user_id", adminId).maybeSingle();
    if (admErr) { console.error("admins:", admErr.message); return json({ error: "error_interno", detalle: "tabla admins: " + admErr.message }, 500); }
    if (!esAdmin) return json({ error: "prohibido" }, 403);
    autorizado = true;
    const puedeAbonar = esAdmin.puede_abonar === true;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Mapa id → datos de usuario (correo, fechas)
    async function usuariosAuth() {
      const m = new Map<string, any>();
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        for (const u of data.users) {
          m.set(u.id, { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, confirmado: !!u.email_confirmed_at });
        }
        if (data.users.length < 200) break;
      }
      return m;
    }
    const mail = (m: Map<string, any>, id: string | null) => (id ? m.get(id)?.email ?? "(usuario eliminado)" : "—");

    // ---------------- RESUMEN ----------------
    if (action === "resumen") {
      const ahora = Date.now();
      const desde14 = new Date(ahora - 14 * DIA_MS).toISOString();
      const [um, cons, rec, wal] = await Promise.all([
        usuariosAuth(),
        db.from("consultas").select("created_at,costo").gte("created_at", desde14).limit(10000),
        db.from("recargas").select("created_at,monto_cents,estado").gte("created_at", desde14).limit(10000),
        db.from("wallets").select("creditos").limit(20000),
      ]);
      const { count: consTotal } = await db.from("consultas").select("id", { count: "exact", head: true });
      const { data: recAprobTotal } = await db.from("recargas").select("monto_cents").eq("estado", "aprobada").limit(50000);
      const { count: pendientes } = await db.from("recargas").select("id", { count: "exact", head: true }).eq("estado", "pendiente");

      const dias: Record<string, { consultas: number; ingresos: number }> = {};
      for (let i = 13; i >= 0; i--) dias[bogota(new Date(ahora - i * DIA_MS).toISOString())] = { consultas: 0, ingresos: 0 };
      for (const c of cons.data ?? []) { const d = bogota(c.created_at); if (dias[d]) dias[d].consultas++; }
      for (const r of rec.data ?? []) if (r.estado === "aprobada") { const d = bogota(r.created_at); if (dias[d]) dias[d].ingresos += Math.round(r.monto_cents / 100); }

      const usuarios = [...um.values()];
      const hace7 = ahora - 7 * DIA_MS;
      return json({
        usuarios_total: usuarios.length,
        usuarios_nuevos_7d: usuarios.filter((u) => new Date(u.created_at).getTime() >= hace7).length,
        consultas_total: consTotal ?? 0,
        consultas_7d: (cons.data ?? []).filter((c) => new Date(c.created_at).getTime() >= hace7).length,
        consultas_24h: (cons.data ?? []).filter((c) => new Date(c.created_at).getTime() >= ahora - DIA_MS).length,
        ingresos_total: Math.round((recAprobTotal ?? []).reduce((a, r) => a + r.monto_cents, 0) / 100),
        ingresos_7d: Math.round((rec.data ?? []).filter((r) => r.estado === "aprobada" && new Date(r.created_at).getTime() >= hace7).reduce((a, r) => a + r.monto_cents, 0) / 100),
        saldo_en_wallets: (wal.data ?? []).reduce((a, w) => a + (w.creditos ?? 0), 0),
        recargas_pendientes: pendientes ?? 0,
        puede_abonar: puedeAbonar,
        serie: Object.entries(dias).map(([dia, v]) => ({ dia, ...v })),
      });
    }

    // ---------------- PROBLEMAS ----------------
    if (action === "problemas") {
      const um = await usuariosAuth();
      const ahora = Date.now();
      const problemas: any[] = [];

      // Pagos pendientes hace más de 15 min (webhook no llegó o falló)
      const { data: pend } = await db.from("recargas").select("id,user_id,reference,monto_cents,created_at")
        .eq("estado", "pendiente").lt("created_at", new Date(ahora - 15 * 60_000).toISOString()).order("created_at", { ascending: false }).limit(100);
      for (const r of pend ?? []) {
        problemas.push({
          severidad: "alta", tipo: "pago_pendiente", cuando: r.created_at,
          titulo: `Recarga de $${Math.round(r.monto_cents / 100).toLocaleString("es-CO")} sin confirmar`,
          detalle: `${mail(um, r.user_id)} · ref ${r.reference}. Verifica en Wompi; si está APROBADA, apruébala desde la pestaña Pagos.`,
          recarga_id: r.id,
        });
      }

      // Consultas en las que una fuente falló (y se cobró igual)
      const { data: cons } = await db.from("consultas")
        .select("id,user_id,placa,created_at,costo,info_err:payload->>infosiniestralError,pla_err:payload->>placapiError")
        .gte("created_at", new Date(ahora - 7 * DIA_MS).toISOString()).order("created_at", { ascending: false }).limit(1000);
      for (const c of cons ?? []) {
        if (c.info_err || c.pla_err) {
          problemas.push({
            severidad: "media", tipo: "fuente_fallida", cuando: c.created_at,
            titulo: `Informe incompleto · placa ${c.placa}`,
            detalle: `${mail(um, c.user_id)} · ${c.info_err ? "InfoSiniestral falló (" + c.info_err + "). " : ""}${c.pla_err ? "PlacApi falló (" + c.pla_err + ")." : ""} Se cobró $${(c.costo ?? 0).toLocaleString("es-CO")}.`,
            consulta_id: c.id,
          });
        }
      }

      // Eventos warn/error últimos 7 días
      const { data: ev } = await db.from("eventos").select("id,nivel,tipo,user_id,detalle,created_at")
        .in("nivel", ["warn", "error"]).gte("created_at", new Date(ahora - 7 * DIA_MS).toISOString())
        .order("created_at", { ascending: false }).limit(150);
      for (const e of ev ?? []) {
        problemas.push({
          severidad: e.nivel === "error" ? "alta" : "media", tipo: e.tipo, cuando: e.created_at,
          titulo: e.tipo.replace(/_/g, " "),
          detalle: `${e.user_id ? mail(um, e.user_id) + " · " : ""}${JSON.stringify(e.detalle ?? {}).slice(0, 300)}`,
        });
      }

      // Saldos negativos (no deberían existir)
      const { data: neg } = await db.from("wallets").select("user_id,creditos").lt("creditos", 0).limit(50);
      for (const w of neg ?? []) {
        problemas.push({ severidad: "alta", tipo: "saldo_negativo", cuando: new Date().toISOString(), titulo: "Saldo negativo", detalle: `${mail(um, w.user_id)} · $${w.creditos}` });
      }

      problemas.sort((a, b) => (a.severidad === b.severidad ? (a.cuando < b.cuando ? 1 : -1) : a.severidad === "alta" ? -1 : 1));
      return json({ problemas });
    }

    // ---------------- USUARIOS ----------------
    if (action === "usuarios") {
      const um = await usuariosAuth();
      const [wal, cons, rec] = await Promise.all([
        db.from("wallets").select("user_id,creditos").limit(20000),
        db.from("consultas").select("user_id,created_at,costo").limit(50000),
        db.from("recargas").select("user_id,monto_cents").eq("estado", "aprobada").limit(50000),
      ]);
      const saldo = new Map((wal.data ?? []).map((w) => [w.user_id, w.creditos]));
      const nCons = new Map<string, { n: number; ultima: string }>();
      for (const c of cons.data ?? []) {
        const x = nCons.get(c.user_id) ?? { n: 0, ultima: "" };
        x.n++; if (c.created_at > x.ultima) x.ultima = c.created_at; nCons.set(c.user_id, x);
      }
      const recargado = new Map<string, number>();
      for (const r of rec.data ?? []) recargado.set(r.user_id, (recargado.get(r.user_id) ?? 0) + Math.round(r.monto_cents / 100));
      const filas = [...um.values()].map((u) => ({
        ...u, saldo: saldo.get(u.id) ?? 0, consultas: nCons.get(u.id)?.n ?? 0,
        ultima_consulta: nCons.get(u.id)?.ultima ?? null, recargado: recargado.get(u.id) ?? 0,
      })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 500);
      return json({ usuarios: filas });
    }

    // ---------------- CONSULTAS ----------------
    if (action === "consultas") {
      const um = await usuariosAuth();
      let q = db.from("consultas")
        .select("id,user_id,placa,doc_type,costo,source,created_at,info_err:payload->>infosiniestralError,pla_err:payload->>placapiError,info_sin:payload->infosiniestral->>sinResultados")
        .order("created_at", { ascending: false }).limit(200);
      const placa = String(body?.placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
      if (placa) q = q.eq("placa", placa);
      if (/^[0-9a-f-]{36}$/i.test(String(body?.user_id ?? ""))) q = q.eq("user_id", body.user_id);
      const { data, error } = await q;
      if (error) throw error;
      let filas = (data ?? []).map((c) => ({ ...c, correo: mail(um, c.user_id) }));
      if (body?.solo_problemas) filas = filas.filter((c) => c.info_err || c.pla_err);
      return json({ consultas: filas });
    }

    if (action === "consulta_detalle") {
      const id = Number(body?.id);
      if (!Number.isInteger(id)) return json({ error: "id_invalido" }, 400);
      const { data } = await db.from("consultas").select("id,placa,created_at,payload").eq("id", id).maybeSingle();
      await registrarEvento(db, "info", "admin_vio_informe", adminId, { consulta_id: id });
      return json({ consulta: data });
    }

    // ---------------- RECARGAS ----------------
    if (action === "recargas") {
      const um = await usuariosAuth();
      let q = db.from("recargas").select("id,user_id,reference,monto_cents,estado,wompi_txn_id,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(200);
      if (["pendiente", "aprobada", "rechazada"].includes(String(body?.estado))) q = q.eq("estado", body.estado);
      const { data, error } = await q;
      if (error) throw error;
      const ahora = Date.now();
      return json({
        recargas: (data ?? []).map((r) => ({
          ...r, monto: Math.round(r.monto_cents / 100), correo: mail(um, r.user_id),
          edad_min: Math.round((ahora - new Date(r.created_at).getTime()) / 60000),
        })),
      });
    }

    // ---------------- EVENTOS ----------------
    if (action === "eventos") {
      const um = await usuariosAuth();
      let q = db.from("eventos").select("id,created_at,nivel,tipo,user_id,detalle").order("created_at", { ascending: false }).limit(200);
      if (["info", "warn", "error"].includes(String(body?.nivel))) q = q.eq("nivel", body.nivel);
      const { data, error } = await q;
      if (error) throw error;
      return json({ eventos: (data ?? []).map((e) => ({ ...e, correo: mail(um, e.user_id) })) });
    }

    // ---------------- SALDOS DE PROVEEDORES ----------------
    if (action === "saldos") {
      const [infosiniestral, placapi] = await Promise.all([estadoProveedor(db, "infosiniestral"), estadoProveedor(db, "placapi")]);
      return json({ umbral: UMBRAL_CONSULTAS, proveedores: [infosiniestral, placapi] });
    }
    if (action === "guardar_saldo") {
      const proveedor = String(body?.proveedor ?? "");
      const saldo = Number(body?.saldo), costo = Number(body?.costo_consulta);
      if (proveedor !== "infosiniestral" && proveedor !== "placapi") return json({ error: "proveedor_invalido" }, 400);
      if (!Number.isFinite(saldo) || saldo < 0 || saldo > 1e9) return json({ error: "saldo_invalido" }, 400);
      if (!Number.isFinite(costo) || costo <= 0 || costo > 1e7) return json({ error: "costo_invalido" }, 400);
      const { error } = await db.from("proveedor_saldos").upsert(
        { proveedor, saldo, costo_consulta: costo, origen: "manual", actualizado_at: new Date().toISOString() }, { onConflict: "proveedor" });
      if (error) throw error;
      await registrarEvento(db, "info", "saldo_proveedor_manual", adminId, { proveedor, saldo, costo_consulta: costo });
      return json({ ok: true });
    }

    // ---------------- ACCIONES (auditadas) ----------------
    if (action === "acreditar") {
      if (!puedeAbonar) {
        await registrarEvento(db, "warn", "intento_abonar_sin_permiso", adminId, { action });
        return json({ error: "sin_permiso_abonar" }, 403);
      }
    }

    if (action === "acreditar") {
      const userId = String(body?.user_id ?? "");
      const monto = Number(body?.monto);
      const motivo = String(body?.motivo ?? "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "usuario_invalido" }, 400);
      if (!Number.isInteger(monto) || monto < 1 || monto > 500000) return json({ error: "monto_invalido" }, 400);
      if (motivo.length < 3 || motivo.length > 200) return json({ error: "motivo_requerido" }, 400);
      const { data, error } = await db.rpc("sumar_creditos", { p_user: userId, p_creditos: monto });
      if (error) { console.error(error.message); return json({ error: "error_interno" }, 500); }
      await registrarEvento(db, "info", "ajuste_manual_saldo", userId, { admin: adminId, monto, motivo, saldo_nuevo: data });
      return json({ ok: true, saldo: data });
    }

    if (action === "aprobar_recarga") {
      const id = Number(body?.id);
      if (!Number.isInteger(id)) return json({ error: "id_invalido" }, 400);
      const { data: rec } = await db.from("recargas")
        .update({ estado: "aprobada", updated_at: new Date().toISOString() })
        .eq("id", id).eq("estado", "pendiente").select("user_id,monto_cents,reference").maybeSingle();
      if (!rec) return json({ error: "recarga_no_pendiente" }, 409);
      const { data: saldo } = await db.rpc("sumar_creditos", { p_user: rec.user_id, p_creditos: Math.round(rec.monto_cents / 100) });
      await registrarEvento(db, "warn", "recarga_aprobada_manual", rec.user_id, { admin: adminId, reference: rec.reference, monto: Math.round(rec.monto_cents / 100) });
      return json({ ok: true, saldo });
    }

    return json({ error: "accion_desconocida" }, 400);
  } catch (e) {
    console.error(e);
    // Solo un admin ya verificado ve el motivo técnico (ayuda a diagnosticar el panel).
    const detalle = autorizado ? String((e as any)?.message ?? e).slice(0, 300) : undefined;
    return json({ error: "error_interno", detalle }, 500);
  }
});
