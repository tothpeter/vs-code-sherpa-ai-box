.PHONY: help
help:
	@echo 'install_locally - Install the extension locally to VS Code'

.PHONY: install_locally
install_locally:
	npm run package
	code --install-extension sherpa-ai-box-0.0.1.vsix
