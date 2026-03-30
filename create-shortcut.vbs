Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Beats Management Studio.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "F:\PlaygroundTest\BeatsManagementVersion2\node_modules\electron\dist\electron.exe"
oLink.Arguments = """F:\PlaygroundTest\BeatsManagementVersion2"""
oLink.WorkingDirectory = "F:\PlaygroundTest\BeatsManagementVersion2"
oLink.Description = "Beats Management Studio"
oLink.Save
