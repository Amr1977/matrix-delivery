#!/bin/bash

#
# Professional CI/CD Deployment Script (Bash version)
#
# Usage:
#   ./scripts/deploy.sh [backend|frontend|all] [--skip-tests]
#

set -e

# Configuration
VPS_HOST="oldantique50.com"
VPS_PORT="2222"
VPS_USER="root"
VPS_PATH="/root/matrix-delivery"
API_URL="https://matrix-api.oldantique50.com"

# Parse arguments
TARGET="${1:-all}"
SKIP_TESTS=false

if [[ "$2" == "--skip-tests" ]] || [[ "$1" == "--skip-tests" ]]; then
    SKIP_TESTS=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    local message="$1"
    local length=${#message}
    echo -e "\n${CYAN}╔$(printf '═%.0s' $(seq 1 $((length + 2))))╗${NC}"
    echo -e "${CYAN}║ $message ║${NC}"
    echo -e "${CYAN}╚$(printf '═%.0s' $(seq 1 $((length + 2))))╝${NC}\n"
}

print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "  ${RED}❌ $1${NC}"
}

print_info() {
    echo -e "  ${GRAY}ℹ️  $1${NC}"
}

# Check if git is clean
check_git_clean() {
    print_step "Checking git status..."
    
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Working directory is not clean. Commit or stash changes first."
        echo -e "\nUncommitted changes:"
        git status --short
        return 1
    fi
    
    print_success "Git working directory is clean"
    return 0
}

# Run linting
run_lint() {
    print_step "Running ESLint..."
    
    if npm run lint; then
        print_success "Linting passed"
        return 0
    else
        print_error "Linting failed"
        print_info "Fix linting errors with: npm run lint:fix"
        return 1
    fi
}

# Run smoke tests
run_smoke_tests() {
    print_step "Running smoke tests..."
    
    if npm run test:smoke; then
        print_success "Smoke tests passed"
        return 0
    else
        print_error "Smoke tests failed"
        return 1
    fi
}

# Build frontend
build_frontend() {
    print_step "Building frontend..."
    
    cd frontend
    if npm run build; then
        cd ..
        print_success "Frontend build completed"
        return 0
    else
        cd ..
        print_error "Frontend build failed"
        return 1
    fi
}

# Deploy backend to VPS
deploy_backend() {
    print_step "Deploying backend to VPS..."
    
    # Pull latest code
    print_info "Pulling latest code from git..."
    ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH && git pull origin master"
    print_success "Code pulled"
    
    # Install dependencies
    print_info "Installing dependencies..."
    ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && npm ci --production"
    print_success "Dependencies installed"
    
    # Reload PM2
    print_info "Reloading PM2 services..."
    ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && pm2 reload ecosystem.config.js --env production"
    print_success "PM2 services reloaded"
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 10
    
    # Health check
    print_info "Running health check..."
    if curl -f -s "$API_URL/api/health" > /dev/null; then
        print_success "Backend health check passed"
        return 0
    else
        print_error "Backend health check failed"
        return 1
    fi
}

# Deploy frontend to Firebase
deploy_frontend() {
    print_step "Deploying frontend to Firebase..."
    
    if node scripts/deploy-firebase.js production; then
        print_success "Frontend deployed to Firebase"
        return 0
    else
        print_error "Frontend deployment failed"
        return 1
    fi
}

# Main deployment flow
main() {
    print_header "Matrix Delivery - Professional Deployment"
    
    echo -e "Target: ${CYAN}$TARGET${NC}"
    echo -e "Skip Tests: ${CYAN}$SKIP_TESTS${NC}\n"
    
    DEPLOY_BACKEND=false
    DEPLOY_FRONTEND=false
    
    if [[ "$TARGET" == "all" ]] || [[ "$TARGET" == "backend" ]]; then
        DEPLOY_BACKEND=true
    fi
    
    if [[ "$TARGET" == "all" ]] || [[ "$TARGET" == "frontend" ]]; then
        DEPLOY_FRONTEND=true
    fi
    
    # Pre-deployment checks
    if [[ "$SKIP_TESTS" == false ]]; then
        print_header "Pre-Deployment Checks"
        
        check_git_clean || exit 1
        run_lint || exit 1
        run_smoke_tests || exit 1
        
        print_success "All pre-deployment checks passed"
    else
        echo -e "\n${YELLOW}⚠️  Skipping pre-deployment tests (not recommended)${NC}"
    fi
    
    # Build frontend if deploying it
    if [[ "$DEPLOY_FRONTEND" == true ]]; then
        print_header "Building Frontend"
        build_frontend || exit 1
    fi
    
    # Deploy backend
    if [[ "$DEPLOY_BACKEND" == true ]]; then
        print_header "Deploying Backend"
        deploy_backend || exit 1
    fi
    
    # Deploy frontend
    if [[ "$DEPLOY_FRONTEND" == true ]]; then
        print_header "Deploying Frontend"
        deploy_frontend || exit 1
    fi
    
    # Final summary
    print_header "Deployment Complete"
    
    if [[ "$DEPLOY_BACKEND" == true ]]; then
        print_success "Backend: $API_URL/api/health"
    fi
    
    if [[ "$DEPLOY_FRONTEND" == true ]]; then
        print_success "Frontend: https://matrix-delivery.web.app"
    fi
    
    echo -e "\n${GREEN}🎉 Deployment successful!${NC}\n"
}

# Run deployment
main "$@"
