#!/bin/bash
#
# AI Life Layer Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/ai-life-layer/main/scripts/install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# App info
APP_NAME="AI Life Layer"
REPO="Noah1206/U.bot"
INSTALL_DIR="/usr/local/bin"
APP_DIR="$HOME/.ai-life-layer"

print_banner() {
    echo -e "${CYAN}"
    echo "    _    ___   _     _  __       _                          "
    echo "   / \  |_ _| | |   (_)/ _| ___ | |    __ _ _   _  ___ _ __ "
    echo "  / _ \  | |  | |   | | |_ / _ \| |   / _\` | | | |/ _ \ '__|"
    echo " / ___ \ | |  | |___| |  _|  __/| |__| (_| | |_| |  __/ |   "
    echo "/_/   \_\___| |_____|_|_|  \___||_____\__,_|\__, |\___|_|   "
    echo "                                           |___/            "
    echo -e "${NC}"
    echo -e "${BLUE}Production-Hardened AI Orchestration System${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Detect OS and architecture
detect_platform() {
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux*)
            PLATFORM="linux"
            case "$ARCH" in
                x86_64) ARCH="x86_64" ;;
                aarch64|arm64) ARCH="aarch64" ;;
                *) print_error "Unsupported architecture: $ARCH"; exit 1 ;;
            esac
            ;;
        Darwin*)
            PLATFORM="darwin"
            case "$ARCH" in
                x86_64) ARCH="x86_64" ;;
                arm64) ARCH="aarch64" ;;
                *) print_error "Unsupported architecture: $ARCH"; exit 1 ;;
            esac
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="windows"
            ARCH="x86_64"
            ;;
        *)
            print_error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac

    echo "$PLATFORM-$ARCH"
}

# Get latest release version
get_latest_version() {
    curl -s "https://api.github.com/repos/$REPO/releases/latest" | \
        grep '"tag_name":' | \
        sed -E 's/.*"([^"]+)".*/\1/'
}

# Download and install
install() {
    print_banner

    print_step "Detecting platform..."
    PLATFORM_ARCH=$(detect_platform)
    echo "  Platform: $PLATFORM_ARCH"

    print_step "Fetching latest version..."
    VERSION=$(get_latest_version)
    if [ -z "$VERSION" ]; then
        VERSION="v0.1.0"
        print_warning "Could not fetch latest version, using $VERSION"
    fi
    echo "  Version: $VERSION"

    # Determine download URL and file extension
    case "$PLATFORM_ARCH" in
        darwin-x86_64)
            DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/ai-life-layer_${VERSION}_x64.dmg"
            EXT="dmg"
            ;;
        darwin-aarch64)
            DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/ai-life-layer_${VERSION}_aarch64.dmg"
            EXT="dmg"
            ;;
        linux-x86_64)
            DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/ai-life-layer_${VERSION}_amd64.AppImage"
            EXT="AppImage"
            ;;
        linux-aarch64)
            DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/ai-life-layer_${VERSION}_aarch64.AppImage"
            EXT="AppImage"
            ;;
        windows-x86_64)
            DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/ai-life-layer_${VERSION}_x64-setup.exe"
            EXT="exe"
            ;;
        *)
            print_error "Unsupported platform: $PLATFORM_ARCH"
            exit 1
            ;;
    esac

    print_step "Creating installation directory..."
    mkdir -p "$APP_DIR"

    print_step "Downloading $APP_NAME $VERSION..."
    TEMP_FILE="$APP_DIR/ai-life-layer.$EXT"

    if command -v curl &> /dev/null; then
        curl -fSL "$DOWNLOAD_URL" -o "$TEMP_FILE" --progress-bar
    elif command -v wget &> /dev/null; then
        wget -q --show-progress "$DOWNLOAD_URL" -O "$TEMP_FILE"
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    print_step "Installing..."
    case "$EXT" in
        dmg)
            # macOS: Mount DMG and copy app
            MOUNT_POINT="/Volumes/AILifeLayer"
            hdiutil attach "$TEMP_FILE" -quiet -mountpoint "$MOUNT_POINT"
            cp -R "$MOUNT_POINT/AI Life Layer.app" "/Applications/"
            hdiutil detach "$MOUNT_POINT" -quiet
            rm "$TEMP_FILE"
            echo -e "${GREEN}✓${NC} Installed to /Applications/AI Life Layer.app"

            # Create CLI symlink
            if [ -w "$INSTALL_DIR" ]; then
                ln -sf "/Applications/AI Life Layer.app/Contents/MacOS/AI Life Layer" "$INSTALL_DIR/ai-life-layer"
                echo -e "${GREEN}✓${NC} CLI available: ai-life-layer"
            fi
            ;;
        AppImage)
            # Linux: Make executable and move
            chmod +x "$TEMP_FILE"
            if [ -w "$INSTALL_DIR" ]; then
                mv "$TEMP_FILE" "$INSTALL_DIR/ai-life-layer"
            else
                sudo mv "$TEMP_FILE" "$INSTALL_DIR/ai-life-layer"
            fi
            echo -e "${GREEN}✓${NC} Installed to $INSTALL_DIR/ai-life-layer"

            # Create desktop entry
            mkdir -p "$HOME/.local/share/applications"
            cat > "$HOME/.local/share/applications/ai-life-layer.desktop" << EOF
[Desktop Entry]
Name=AI Life Layer
Comment=Production-Hardened AI Orchestration System
Exec=$INSTALL_DIR/ai-life-layer
Icon=$APP_DIR/icon.png
Type=Application
Categories=Development;Utility;
EOF
            ;;
        exe)
            # Windows: Run installer
            print_step "Launching Windows installer..."
            cmd.exe /c "$TEMP_FILE"
            ;;
    esac

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  $APP_NAME installed successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  To start the app:"
    case "$EXT" in
        dmg)
            echo "    • Open 'AI Life Layer' from Applications"
            echo "    • Or run: ai-life-layer"
            ;;
        AppImage)
            echo "    • Run: ai-life-layer"
            ;;
        exe)
            echo "    • Open 'AI Life Layer' from Start Menu"
            ;;
    esac
    echo ""
    echo "  Documentation: https://github.com/$REPO"
    echo ""
}

# Uninstall
uninstall() {
    print_banner
    print_step "Uninstalling $APP_NAME..."

    # macOS
    if [ -d "/Applications/AI Life Layer.app" ]; then
        rm -rf "/Applications/AI Life Layer.app"
        echo "  Removed /Applications/AI Life Layer.app"
    fi

    # Linux/macOS CLI
    if [ -f "$INSTALL_DIR/ai-life-layer" ]; then
        rm -f "$INSTALL_DIR/ai-life-layer"
        echo "  Removed $INSTALL_DIR/ai-life-layer"
    fi

    # Desktop entry
    if [ -f "$HOME/.local/share/applications/ai-life-layer.desktop" ]; then
        rm -f "$HOME/.local/share/applications/ai-life-layer.desktop"
        echo "  Removed desktop entry"
    fi

    # App directory
    if [ -d "$APP_DIR" ]; then
        rm -rf "$APP_DIR"
        echo "  Removed $APP_DIR"
    fi

    echo ""
    echo -e "${GREEN}$APP_NAME uninstalled successfully.${NC}"
}

# Main
case "${1:-install}" in
    install)
        install
        ;;
    uninstall)
        uninstall
        ;;
    *)
        echo "Usage: $0 {install|uninstall}"
        exit 1
        ;;
esac
