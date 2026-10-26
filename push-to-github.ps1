Write-Output "Pushing D:\agent-skills to https://github.com/heruumhmd/my-agent-skills.git..."
git -C "D:\agent-skills" push -u mybackup main
if ($LASTEXITCODE -eq 0) {
    git -C "D:\agent-skills" push mybackup --tags
    if ($LASTEXITCODE -ne 0) { throw "Tag push failed with exit code $LASTEXITCODE" }
    Write-Output "`n[SUCCESS] All 53 Skills, Subagents, and Frameworks successfully backed up to your GitHub, including tags!"
} else {
    Write-Output "`n[NOTE] If repository is not created yet, please create it at: https://github.com/new?name=my-agent-skills"
}
