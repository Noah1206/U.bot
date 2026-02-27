.PHONY: install dev build release clean backend

# Installation
install:
	npm install
	cd backend && pip install -r requirements.txt

# Development
dev:
	npm run tauri dev

dev-web:
	npm run dev

dev-backend:
	cd backend && python server.py

# Build
build:
	npm run tauri build

build-web:
	npm run build

# Release (requires git tag)
release:
	@echo "To release:"
	@echo "  1. Update version in package.json and src-tauri/tauri.conf.json"
	@echo "  2. git tag v0.x.x"
	@echo "  3. git push origin v0.x.x"
	@echo "  GitHub Actions will build and create release automatically"

# Clean
clean:
	rm -rf node_modules dist src-tauri/target
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Backend only
backend:
	cd backend && python server.py

# Type check
typecheck:
	npx tsc --noEmit

# Help
help:
	@echo "AI Life Layer - Makefile Commands"
	@echo ""
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Run Tauri development mode"
	@echo "  make dev-web     - Run web-only development"
	@echo "  make dev-backend - Run Python backend server"
	@echo "  make build       - Build production app"
	@echo "  make clean       - Remove build artifacts"
	@echo "  make typecheck   - Run TypeScript type checking"
	@echo "  make help        - Show this help"
