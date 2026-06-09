# Quick start: your first run — add an xray server and get connected, all in the TUI
Output docs/images/quickstart.gif
Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 980
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 70ms

Hide
Type "export PATH=$HOME/.bun/bin:$PATH VPN_DEMO=1 VPN_DEMO_FRESH=1 XDG_CONFIG_HOME=/tmp/vpnfresh; rm -rf /tmp/vpnfresh; mkdir -p /tmp/vpnfresh; clear"
Enter
Show

Type "vpn"
Enter
Sleep 4s
Enter
Sleep 1800ms
Type@10ms "vless://00000000-0000-4000-8000-000000000000@192.0.2.20:443?security=reality&pbk=demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO000&sni=www.microsoft.com&fp=chrome&type=tcp&flow=xtls-rprx-vision&sid=01ab#amsterdam"
Sleep 1500ms
Enter
Sleep 1800ms
Enter
Sleep 4000ms
Type "q"
Sleep 800ms
