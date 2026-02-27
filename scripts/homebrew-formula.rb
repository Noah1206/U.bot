# Homebrew Formula for AI Life Layer
# To use: brew tap Noah1206/U.bot && brew install ai-life-layer

class AiLifeLayer < Formula
  desc "Production-Hardened AI Orchestration System"
  homepage "https://github.com/Noah1206/U.bot"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/Noah1206/U.bot/releases/download/v#{version}/ai-life-layer_v#{version}_aarch64.dmg"
      sha256 "REPLACE_WITH_SHA256"
    end
    on_intel do
      url "https://github.com/Noah1206/U.bot/releases/download/v#{version}/ai-life-layer_v#{version}_x64.dmg"
      sha256 "REPLACE_WITH_SHA256"
    end
  end

  def install
    # Extract app from DMG
    prefix.install Dir["*.app"].first
  end

  def caveats
    <<~EOS
      AI Life Layer has been installed to:
        #{prefix}/AI Life Layer.app

      To open the app:
        open "#{prefix}/AI Life Layer.app"

      Or add to Applications:
        ln -sf "#{prefix}/AI Life Layer.app" /Applications/
    EOS
  end
end
