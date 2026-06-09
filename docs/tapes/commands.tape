# Commands: list servers, turn the xray proxy on, check the exit IP, turn it off
Output docs/images/commands.gif
Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 540
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 80ms

Hide
Type "export PATH=$HOME/.bun/bin:$PATH VPN_DEMO=1 XDG_CONFIG_HOME=/tmp/vpndemo; PS1='$ '; echo en > /tmp/vpndemo/vpn/lang; clear"
Enter
Show

Type "vpn ls"
Sleep 500ms
Enter
Sleep 1800ms
Type "vpn on"
Sleep 500ms
Enter
Sleep 2500ms
Type "vpn ip"
Sleep 500ms
Enter
Sleep 1800ms
Type "vpn off"
Sleep 500ms
Enter
Sleep 2500ms
