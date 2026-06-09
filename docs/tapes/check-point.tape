# Check Point: connect the corporate VPN with password + OTP, right in the TUI
Output docs/images/check-point.gif
Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 760
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 90ms

# Navigate to the Check Point card and open the connect form off-camera.
Hide
Type "export PATH=$HOME/.bun/bin:$PATH VPN_DEMO=1 XDG_CONFIG_HOME=/tmp/vpndemo; echo en > /tmp/vpndemo/vpn/lang; clear"
Enter
Type "vpn"
Enter
Sleep 3500ms
Down
Sleep 250ms
Down
Sleep 250ms
Right
Sleep 250ms
Enter
Sleep 1500ms
Show

# Record the three-step form: username → password (masked) → one-time code.
Sleep 900ms
Type "j.doe"
Sleep 900ms
Enter
Sleep 1300ms
Type "S3cr3t-pass"
Sleep 900ms
Enter
Sleep 1300ms
Type "184502"
Sleep 2000ms

Hide
Escape
Type "q"
