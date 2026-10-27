const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
) {
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
    return respond(500, { error: "Account service is not configured." });
  }

  const token = authorization.replace(/^Bearer\s+/i, "");
  const { response: authResponse, data: user } = await apiRequest(
    supabaseUrl,
    anonKey,
    "/auth/v1/user",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!authResponse.ok || !user?.id) {
    return respond(401, { error: "Sign in before creating an account." });
  }

  const { response: profileResponse, data: callerProfiles } = await apiRequest(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`,
  );
  const callerProfile = Array.isArray(callerProfiles) ? callerProfiles[0] : null;
  if (!profileResponse.ok || !callerProfile) {
    return respond(403, { error: "Your account has no assigned role." });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Invalid request body." });
  }

  const targetRole = body.targetRole;
  const isAllowed =
    (callerProfile.role === "admin" && targetRole === "teacher") ||
    (callerProfile.role === "teacher" && targetRole === "student");
  if (!isAllowed) {
    return respond(403, { error: "Your role cannot create this account type." });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || !email.includes("@") || password.length < 8) {
    return respond(400, { error: "Enter a name, valid email, and password of at least 8 characters." });
  }

  const profile: Record<string, unknown> = {
    email,
    name,
    role: targetRole,
  };
  if (targetRole === "teacher") {
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    if (!subject) return respond(400, { error: "Enter the teacher's subject." });
    profile.subject = subject;
  } else {
    const studentClass = typeof body.class === "string" ? body.class.trim() : "";
    const section = typeof body.section === "string" ? body.section.trim() : "";
    const rollNo = typeof body.roll_no === "string" ? body.roll_no.trim() : "";
    if (!studentClass || !section || !rollNo) {
      return respond(400, { error: "Enter the student's class, section, and roll number." });
    }
    profile.class = studentClass;
    profile.section = section;
    profile.roll_no = rollNo;
    profile.teacher_id = user.id;
  }

  const { response: createResponse, data: createdUser } = await apiRequest(
    supabaseUrl,
    serviceRoleKey,
    "/auth/v1/admin/users",
    {
      method: "POST",
      body: JSON.stringify({ email, password, email_confirm: true }),
    },
  );
  if (!createResponse.ok || !createdUser?.id) {
    return respond(400, {
      error: createdUser?.message || "Could not create Auth user.",
    });
  }

  profile.id = createdUser.id;
  const { response: insertResponse, data: insertError } = await apiRequest(
    supabaseUrl,
    serviceRoleKey,
    "/rest/v1/profiles",
    { method: "POST", body: JSON.stringify(profile) },
  );
  if (!insertResponse.ok) {
    await apiRequest(
      supabaseUrl,
      serviceRoleKey,
      `/auth/v1/admin/users/${encodeURIComponent(createdUser.id)}`,
      { method: "DELETE" },
    );
    return respond(400, {
      error: insertError?.message || "Could not create profile.",
    });
  }

  return respond(201, { profile });
});