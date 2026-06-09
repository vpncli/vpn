# Homebrew formula for vpn. Lives in the tap repo `vpncli/homebrew-tap`.
#
#   brew install vpncli/tap/vpn
#
# The sha256 placeholders are filled in automatically by the release workflow.
class Vpn < Formula
  desc "Manage every VPN from your terminal: xray proxy plus full-tunnel apps"
  homepage "https://github.com/vpncli/vpn"
  version "0.1.0"
  license "MIT"

  # xray is the actual proxy engine; vpn drives it.
  depends_on "xray"

  on_macos do
    on_arm do
      url "https://github.com/vpncli/vpn/releases/download/v#{version}/vpn-darwin-arm64"
      sha256 "REPLACE_DARWIN_ARM64"
    end
    on_intel do
      url "https://github.com/vpncli/vpn/releases/download/v#{version}/vpn-darwin-x64"
      sha256 "REPLACE_DARWIN_X64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/vpncli/vpn/releases/download/v#{version}/vpn-linux-arm64"
      sha256 "REPLACE_LINUX_ARM64"
    end
    on_intel do
      url "https://github.com/vpncli/vpn/releases/download/v#{version}/vpn-linux-x64"
      sha256 "REPLACE_LINUX_X64"
    end
  end

  def install
    # The downloaded artifact keeps its release name (vpn-<os>-<arch>); install as `vpn`.
    binary = Dir["vpn-*"].first || "vpn"
    bin.install binary => "vpn"
  end

  test do
    assert_match "manage every VPN from your terminal", shell_output("#{bin}/vpn help")
  end
end
