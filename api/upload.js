const { Octokit } = require("@octokit/rest");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'لم يتم استلام بيانات الملف' });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = "Aseemcraft";
  const repo = "horizon-mod-converter";
  const path = "input_mod.jar";

  try {
    let sha;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      sha = data.sha;
    } catch (e) {}

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: "Upload new mod via Web UI",
      content: fileBase64,
      sha,
    });

    res.status(200).json({ 
      success: true, 
      actionsUrl: `https://github.com{owner}/${repo}/actions` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
