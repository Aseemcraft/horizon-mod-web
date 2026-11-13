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
    if (!latestRun) {
      return res.status(200).json({ status: "waiting", message: "في انتظار بدء السيرفر..." });
    }

    if (latestRun.status !== "completed") {
      return res.status(200).json({ 
        status: "in_progress", 
        message: "جاري المعالجة في المصنع السحابي (" + latestRun.status + ")..." 
      });
    }

    if (latestRun.conclusion !== "success") {
      return res.status(200).json({ 
        status: "failed", 
        message: "فشلت عملية التحويل في المصنع: " + latestRun.conclusion 
      });
    }

    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: latestRun.id,
    });

    const modArtifact = artifacts.artifacts[0];
    if (!modArtifact) {
      return res.status(200).json({ status: "failed", message: "لم يتم العثور على ملف ناتج." });
    }

    if (req.query.download === "true") {
      const download = await octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: modArtifact.id,
        archive_format: "zip",
      });

      const zip = new AdmZip(Buffer.from(download.data));
      const zipEntries = zip.getEntries();
      const firstFile = zipEntries[0];

      if (firstFile) {
        const fileName = firstFile.entryName.split('/').pop();
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        return res.send(firstFile.getData());
      }
    }

    return res.status(200).json({ status: "ready", runId: latestRun.id });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};
