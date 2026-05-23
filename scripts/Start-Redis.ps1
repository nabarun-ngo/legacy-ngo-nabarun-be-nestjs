# Redis container name
$containerName = "redis"

# Check if Docker daemon is running
docker info > $null 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Starting Docker Desktop..."

    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    # Wait for Docker to become ready
    do {
        Start-Sleep -Seconds 5
        docker info > $null 2>&1
    } until ($LASTEXITCODE -eq 0)

    Write-Host "Docker started successfully"
}
else {
    Write-Host "Docker is already running"
}

# Check if Redis container already exists
$existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}"

if ($existingContainer -eq $containerName) {

    # Check if container is running
    $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}"

    if ($runningContainer -eq $containerName) {
        Write-Host "Redis container is already running"
    }
    else {
        Write-Host "Starting existing Redis container..."
        docker start $containerName
    }
}
else {
    Write-Host "Creating and starting new Redis container..."

    docker run -d `
        --name redis `
        -p 6379:6379 `
        redis
}

Write-Host "Redis is ready"