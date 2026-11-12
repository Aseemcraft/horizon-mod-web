const { Octokit } = require("@octokit/rest");
const AdmZip = require("adm-zip");

module.exports = async (req, res) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = "Aseemcraft";
  const repo = "horizon-mod-converter";

  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
    });

    const latestRun = runs.workflow_runs[0];
    if (!latestRun) return res.status(200).json({ status: "waiting" });
    if (latestRun.status !== "completed") return res.status(200).json({ status: "in_progress" });

    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: latestRun.id,
    });

    const modArtifact = artifacts.artifacts[0];
    if (!modArtifact) return res.status(200).json({ status: "failed" });

    if (req.query.download === "true") {
      const download = await octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: modArtifact.id,
        archive_format: "zip",
      });

      // فك ضغط ملف GitHub واستخراج ملف .hmod أو .hnmod الصافي مباشرة
      const zip = new AdmZip(Buffer.from(download.data));
      const zipEntries = zip.getEntries();
      const modFile = zipEntries.find(entry => entry.entryName.endsWith(".hmod") || entry.entryName.endsWith(".hnmod"));

      if (modFile) {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${modFile.entryName}"`);
        return res.send(modFile.getData());
      } else {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", 'attachment; filename="Converted-Mod.zip"');
        return res.send(Buffer.from(download.data));
      }
    }

    return res.status(200).json({ status: "ready" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
