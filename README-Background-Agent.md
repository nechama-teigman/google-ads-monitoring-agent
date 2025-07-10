# Google Ads Background Monitoring Agent

A Windows service that continuously monitors your Google Ads campaigns for disapproved ads and automatically creates duplicates to maintain ad performance.

## Features

- ✅ **Continuous Monitoring**: Runs every 60 minutes automatically
- ✅ **Background Service**: Runs as a Windows service (no terminal needed)
- ✅ **Comprehensive Logging**: All activities logged to `agent-logs.txt`
- ✅ **Error Handling**: Graceful error handling and recovery
- ✅ **Automatic Startup**: Service starts automatically with Windows
- ✅ **Easy Management**: Simple PowerShell commands to manage the service

## Quick Start

### 1. Install the Service

Run PowerShell as **Administrator** and execute:

```powershell
.\install-service.ps1
```

This will:
- Create a Windows service named "GoogleAdsMonitoringAgent"
- Set it to start automatically with Windows
- Start the service immediately

### 2. Check Service Status

```powershell
.\manage-agent.ps1 -Action status
```

### 3. View Recent Logs

```powershell
.\manage-agent.ps1 -Action logs
```

## Management Commands

| Command | Description |
|---------|-------------|
| `.\manage-agent.ps1 -Action status` | Check if service is running |
| `.\manage-agent.ps1 -Action start` | Start the service |
| `.\manage-agent.ps1 -Action stop` | Stop the service |
| `.\manage-agent.ps1 -Action restart` | Restart the service |
| `.\manage-agent.ps1 -Action logs` | View recent log entries |
| `.\manage-agent.ps1 -Action install` | Install the service |
| `.\manage-agent.ps1 -Action uninstall` | Remove the service |

## How It Works

1. **Monitoring**: The agent queries all enabled/paused campaigns every 60 minutes
2. **Detection**: Finds ads with disapproval status (limited approval, disapproved, under review)
3. **Filtering**: Focuses on campaigns containing "AMG" in the name
4. **Duplication**: Creates exact duplicates of disapproved ads
5. **Pausing**: Pauses the original disapproved ads to stay within 3-ad limits
6. **Logging**: Records all activities with timestamps

## File Structure

```
VisaGo Ads/
├── background-agent.js          # Main background agent
├── install-service.ps1         # Service installer
├── manage-agent.ps1            # Service management
├── agent-logs.txt              # Log file (created automatically)
├── secrets.json                # Your Google Ads credentials
├── .env                        # Environment variables
└── README-Background-Agent.md  # This file
```

## Configuration

### Required Files

1. **`secrets.json`** - Your Google Ads API credentials
2. **`.env`** - Environment variables (OPENAI_API_KEY)

### Service Settings

- **Monitoring Interval**: 60 minutes (configurable in `background-agent.js`)
- **Customer ID**: 2080307721 (your sub-account)
- **Dry Run Mode**: Set to `false` for live operation

## Troubleshooting

### Service Won't Start

1. Check if Node.js is installed:
   ```powershell
   node --version
   ```

2. Verify credentials file exists:
   ```powershell
   Test-Path secrets.json
   ```

3. Check service logs:
   ```powershell
   Get-EventLog -LogName Application -Source "GoogleAdsMonitoringAgent" -Newest 10
   ```

### View Detailed Logs

```powershell
Get-Content agent-logs.txt -Tail 50
```

### Service Status Issues

```powershell
# Check Windows service status
Get-Service -Name "GoogleAdsMonitoringAgent"

# Check if service is running
.\manage-agent.ps1 -Action status
```

## Security Notes

- The service runs with system privileges
- Credentials are stored in `secrets.json` (keep secure)
- Logs may contain sensitive information
- Service runs automatically on system startup

## Performance

- **Memory Usage**: ~50-100MB
- **CPU Usage**: Minimal (only during monitoring cycles)
- **Network**: Only during API calls to Google Ads
- **Disk**: Log file grows over time (rotate if needed)

## Manual Testing

To test the agent without installing as a service:

```powershell
node background-agent.js
```

This will run the agent in the foreground with full logging.

## Uninstalling

To completely remove the service:

```powershell
.\manage-agent.ps1 -Action uninstall
```

This will:
- Stop the service if running
- Remove the service from Windows
- Keep your log files intact

## Support

If you encounter issues:

1. Check the logs: `.\manage-agent.ps1 -Action logs`
2. Verify service status: `.\manage-agent.ps1 -Action status`
3. Restart the service: `.\manage-agent.ps1 -Action restart`
4. Check Windows Event Viewer for system errors

## Log File Rotation

The log file (`agent-logs.txt`) will grow over time. To manage it:

```powershell
# Archive old logs (optional)
$Date = Get-Date -Format "yyyy-MM-dd"
Rename-Item agent-logs.txt "agent-logs-$Date.txt"
```

The service will create a new log file automatically. 