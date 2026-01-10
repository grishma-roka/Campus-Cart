$ErrorActionPreference = "Continue"
Write-Host "Starting git commit process..."

try {
    Write-Host "Adding files to git..."
    git add .
    
    Write-Host "Committing changes..."
    git commit -m "Fix items display with student-friendly prices and better image handling"
    
    Write-Host "Pushing to remote repository..."
    git push
    
    Write-Host "✅ Commit completed successfully!"
} catch {
    Write-Host "❌ Error during commit: $($_.Exception.Message)"
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")