Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Beats Management.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "F:\PlaygroundTest\BeatsManagement\node_modules\.bin\electron.cmd"
oLink.Arguments = "F:\PlaygroundTest\BeatsManagement"
oLink.WorkingDirectory = "F:\PlaygroundTest\BeatsManagement"
oLink.Description = "Beats Management App"
oLink.Save
