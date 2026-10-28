const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ApiResult = { response: Response; data: any };

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function apiRequest(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  return { response, data };
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Sync service is not configured." });
  }

  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { response: authResponse, data: user } = await apiRequest(
      supabaseUrl,
      anonKey,
      "/auth/v1/user",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!authResponse.ok || !user?.id) {
      return respond(401, { error: "Sign in to sync this data." });
    }

    const { response: profileResponse, data: profiles } = await apiRequest(
      supabaseUrl,
      serviceRoleKey,
      `/rest/v1/profiles?select=id,role,teacher_id&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profileResponse.ok || !profile) {
      return respond(403, { error: "Your account has no assigned role." });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return respond(400, { error: "Invalid request body." });
    }

    if (body.action === "admin-directory") {
      if (profile.role !== "admin") {
        return respond(403, { error: "Administrator access is required." });
      }
      const { response, data } = await apiRequest(
        supabaseUrl,
        serviceRoleKey,
        "/rest/v1/profiles?select=id,email,name,role,class,section,roll_no,subject&role=in.(teacher,student)&order=name.asc",
      );
      if (!response.ok || !Array.isArray(data)) {
        return respond(500, { error: "Could not load the school directory." });
      }
      return respond(200, {
        teachers: data.filter((item: any) => item.role === "teacher"),
        students: data.filter((item: any) => item.role === "student"),
      });
    }

    if (body.action === "create-session") {
      if (profile.role !== "teacher") {
        return respond(403, { error: "Teacher access is required." });
      }
      const attendanceDate = body.attendanceDate;
      const expiresMinutes = Number(body.expiresMinutes ?? 120);
      if (
        !validDate(attendanceDate) ||
        !Number.isInteger(expiresMinutes) ||
        expiresMinutes < 1 ||
        expiresMinutes > 120
      ) {
        return respond(400, { error: "Invalid attendance session details." });
      }

      const createdAt = new Date();
      const session = {
        id: crypto.randomUUID(),
        teacher_id: user.id,
        attendance_date: attendanceDate,
        created_at: createdAt.toISOString(),
        expires_at: new Date(
          createdAt.getTime() + expiresMinutes * 60 * 1000,
        ).toISOString(),
      };
      const { response, data } = await apiRequest(
        supabaseUrl,
        serviceRoleKey,
        "/rest/v1/attendance_sessions",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(session),
        },
      );
      const created = Array.isArray(data) ? data[0] : null;
      if (!response.ok || !created) {
        return respond(500, {
          error: "Could not create the attendance session.",
        });
      }

      return respond(200, {
        id: created.id,
        date: created.attendance_date,
        teacherId: created.teacher_id,
        createdAt: created.created_at,
        expiresAt: created.expires_at,
        qrValue: JSON.stringify({
          app: "attende",
          type: "attendance-session",
          version: 1,
          sessionId: created.id,
          date: created.attendance_date,
          teacherId: created.teacher_id,
          createdAt: created.created_at,
          expiresAt: created.expires_at,
        }),
      });
    }

    if (body.action === "check-in") {
      if (profile.role !== "student") {
        return respond(403, {
          error: "A student account is required to check in.",
        });
      }
      if (typeof body.qrValue !== "string") {
        return respond(400, { error: "Attendance QR data is required." });
      }

      let payload: any;
      try {
        payload = JSON.parse(body.qrValue);
      } catch {
        return respond(400, {
          error: "This is not a valid Attende attendance QR.",
        });
      }
      if (
        !payload ||
        payload.app !== "attende" ||
        payload.type !== "attendance-session" ||
        payload.version !== 1 ||
        typeof payload.sessionId !== "string"
      ) {
        return respond(400, {
          error: "This is not a valid Attende attendance QR.",
        });
      }

      const sessionId = encodeURIComponent(payload.sessionId);
      const { response: sessionResponse, data: sessions } = await apiRequest(
        supabaseUrl,
        serviceRoleKey,
        `/rest/v1/attendance_sessions?select=id,teacher_id,attendance_date,created_at,expires_at&id=eq.${sessionId}&limit=1`,
      );
      const session = Array.isArray(sessions) ? sessions[0] : null;
      if (
        !sessionResponse.ok ||
        !session ||
        session.teacher_id !== payload.teacherId ||
        profile.teacher_id !== session.teacher_id ||
        session.attendance_date !== payload.date ||
        session.created_at !== payload.createdAt ||
        session.expires_at !== payload.expiresAt ||
        Date.parse(session.expires_at) <= Date.now()
      ) {
        return respond(400, {
          error: "This attendance QR is invalid or expired.",
        });
      }

      const studentId = encodeURIComponent(user.id);
      const { response: existingResponse, data: existingCheckins } =
        await apiRequest(
          supabaseUrl,
          serviceRoleKey,
          `/rest/v1/attendance_checkins?select=checked_in_at&session_id=eq.${sessionId}&student_id=eq.${studentId}&limit=1`,
        );
      if (!existingResponse.ok) {
        return respond(500, {
          error: "Could not verify the attendance check-in.",
        });
      }
      if (Array.isArray(existingCheckins) && existingCheckins.length) {
        return respond(200, {
          ok: true,
          checkedInAt: existingCheckins[0].checked_in_at,
          session: {
            id: session.id,
            date: session.attendance_date,
            teacherId: session.teacher_id,
            createdAt: session.created_at,
            expiresAt: session.expires_at,
          },
        });
      }

      const checkedInAt = new Date().toISOString();
      const { response: checkinResponse } = await apiRequest(
        supabaseUrl,
        serviceRoleKey,
        "/rest/v1/attendance_checkins",
        {
          method: "POST",
          body: JSON.stringify({
            session_id: payload.sessionId,
            student_id: user.id,
            checked_in_at: checkedInAt,
          }),
        },
      );
      if (!checkinResponse.ok) {
        return respond(409, {
          error: "You have already checked in for this session.",
        });
      }

      const { response: attendanceResponse } = await apiRequest(
        supabaseUrl,
        serviceRoleKey,
        "/rest/v1/daily_attendance?on_conflict=student_id,attendance_date",
        {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            student_id: user.id,
            attendance_date: session.attendance_date,
            status: "present",
            updated_by: user.id,
            updated_at: checkedInAt,
          }),
        },
      );
      if (!attendanceResponse.ok) {
        await apiRequest(
          supabaseUrl,
          serviceRoleKey,
          `/rest/v1/attendance_checkins?session_id=eq.${sessionId}&student_id=eq.${studentId}`,
          { method: "DELETE" },
        );
        return respond(500, { error: "Could not save attendance." });
      }

      return respond(200, {
        ok: true,
        checkedInAt,
        session: {
          id: session.id,
          date: session.attendance_date,
          teacherId: session.teacher_id,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
        },
      });
    }

    return respond(400, { error: "Unknown sync action." });
  } catch (error) {
    console.error("Sync request failed.", error);
    return respond(500, { error: "Sync request failed. Please try again." });
  }
});
