const { Octokit } = require("@octokit/rest");

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileBase64, platform } = req.body;
  if (!fileBase64) return res.status(400).json({ error: 'لم يتم استلام بيانات الملف' });

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = "Aseemcraft";
  const repo = "horizon-mod-converter";

  async function upsertFile(filePath, contentBase64, msg) {
    let sha;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      sha = data.sha;
    } catch (e) {}
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: filePath, message: msg, content: contentBase64, sha
    });
  }

  try {
    const targetText = Buffer.from(platform || "android").toString("base64");
    await upsertFile("target_platform.txt", targetText, "Set target platform");
    await upsertFile("input_mod.jar", fileBase64, "Upload new mod via Web UI");

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
