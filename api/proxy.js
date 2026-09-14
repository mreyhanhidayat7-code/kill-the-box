const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method tidak diizinkan." });
  }

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({
      ok: false,
      message: "APPS_SCRIPT_URL belum diatur di Vercel Environment Variables."
    });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, message: "Google Apps Script mengirim respons bukan JSON." };
    }

    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Gagal terhubung ke database Google Sheet."
    });
  }
}
