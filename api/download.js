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

    const latestRun = runs.workflow_runs;
    if (!latestRun) return res.status(200).json({ status: "waiting" });

    // التحقق من أن العملية حديثة (تم إنشاؤها خلال آخر 4 دقائق) لتجنب سحب الملفات القديمة
    const runAgeMs = Date.now() - new Date(latestRun.created_at).getTime();
    if (req.query.download !== "true" && runAgeMs > 240000) {
      return res.status(200).json({ status: "waiting_for_new_run" });
    }

    if (latestRun.status !== "completed") {
      return res.status(200).json({ status: "in_progress" });
    }

    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: latestRun.id,
    });

    const modArtifact = artifacts.artifacts;
    if (!modArtifact) return res.status(200).json({ status: "failed" });

    if (req.query.download === "true") {
      const download = await octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: modArtifact.id,
        archive_format: "zip",
      });

      const zip = new AdmZip(Buffer.from(download.data));
      const zipEntries = zip.getEntries();
      const firstFile = zipEntries;

      if (firstFile) {
        const fileName = firstFile.entryName.split('/').pop();
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        return res.send(firstFile.getData());
      }
    }

    return res.status(200).json({ status: "ready" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
