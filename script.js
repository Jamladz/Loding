const tg = window.Telegram.WebApp;
tg.expand();
tg.disableVerticalSwipes();
tg.enableClosingConfirmation();
tg.setHeaderColor('#0f172a');
tg.setBackgroundColor('#1e293b');
tg.setBottomBarColor('#1e293b');

// App State
let userData = {
    piBalance: 0,
    totalEarned: 0,
    tasksCompleted: 0,
    airdropPoints: 0,
    lastClaim: null,
    lastAdWatch: null,
    joinedChannel: false,
    kycVerified: false,
    walletConnected: false,
    tonBalance: 0,
    walletAddress: null,
    airdropTier: 'Bronze',
    referralCount: 0
};

// TON Wallet Configuration
const RECIPIENT_WALLET = 'UQCTZAMbXoN5T43K9gJXH8GYWBmIstXrUrdoV9kv3btN1Ad3';

class TONWalletManager {
    constructor() {
        this.provider = null;
        this.isConnected = false;
        this.address = null;
        this.balance = 0;
        this.init();
    }

    init() {
        this.detectWallet();
        this.loadWalletState();
    }

    detectWallet() {
        if (window.tonkeeper) {
            this.provider = 'tonkeeper';
        } else if (window.tonwallet) {
            this.provider = 'tonwallet';
        } else if (tg?.initDataUnsafe?.user) {
            this.provider = 'telegram';
        }
    }

    loadWalletState() {
        const saved = localStorage.getItem('ton_wallet_state');
        if (saved) {
            const state = JSON.parse(saved);
            this.isConnected = state.isConnected;
            this.address = state.address;
            this.balance = state.balance;
            this.updateUI();
        }
    }

    saveWalletState() {
        const state = {
            isConnected: this.isConnected,
            address: this.address,
            balance: this.balance
        };
        localStorage.setItem('ton_wallet_state', JSON.stringify(state));
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.provider === 'telegram' && tg.platform !== 'unknown') {
                tg.openInvoice('https://t.me/piswapbot/invoice/connect', (status) => {
                    if (status === 'paid') {
                        this.isConnected = true;
                        this.address = 'Telegram Built-in Wallet';
                        this.balance = Math.random() * 10;
                        this.saveWalletState();
                        this.updateUI();
                        resolve(true);
                    } else {
                        reject(new Error('Connection cancelled'));
                    }
                });
            } else {
                // Simulate wallet connection
                setTimeout(() => {
                    this.isConnected = true;
                    this.address = 'EQC' + Math.random().toString(36).substr(2, 48);
                    this.balance = (Math.random() * 15).toFixed(4);
                    this.saveWalletState();
                    this.updateUI();
                    resolve(true);
                }, 2000);
            }
        });
    }

    disconnect() {
        this.isConnected = false;
        this.address = null;
        this.balance = 0;
        this.saveWalletState();
        this.updateUI();
    }

    async sendTransaction(amount) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Wallet not connected'));
                return;
            }

            if (this.balance < amount) {
                reject(new Error('Insufficient balance'));
                return;
            }

            // Simulate transaction
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    this.balance -= amount;
                    this.saveWalletState();
                    this.updateUI();
                    resolve({
                        hash: '0x' + Math.random().toString(36).substr(2, 64),
                        success: true
                    });
                } else {
                    reject(new Error('Transaction failed'));
                }
            }, 3000);
        });
    }

    updateUI() {
        // Update wallet status
        const statusElement = document.getElementById('walletStatus');
        const statusProfile = document.getElementById('walletStatusProfile');
        const sheetBalance = document.getElementById('sheetTonBalance');
        const sheetAddress = document.getElementById('sheetWalletAddress');

        if (this.isConnected) {
            statusElement.innerHTML = `
                <div class="status-indicator connected"></div>
                <span>TON Wallet Connected</span>
            `;
            statusProfile.textContent = 'Connected';
            statusProfile.className = 'status-badge completed';
            sheetBalance.textContent = `${this.balance} TON`;
            sheetAddress.textContent = this.address;
        } else {
            statusElement.innerHTML = `
                <div class="status-indicator disconnected"></div>
                <span>TON Wallet Not Connected</span>
            `;
            statusProfile.textContent = 'Not Connected';
            statusProfile.className = 'status-badge disconnected';
            sheetBalance.textContent = '0 TON';
            sheetAddress.textContent = 'Not connected';
        }
    }
}

// Initialize TON Wallet
const tonWallet = new TONWalletManager();

// Load user data from localStorage
function loadUserData() {
    const saved = localStorage.getItem('pi_swap_user_data');
    if (saved) {
        userData = { ...userData, ...JSON.parse(saved) };
    }
    updateUI();
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem('pi_swap_user_data', JSON.stringify(userData));
}

// Update all UI elements
function updateUI() {
    // Update balances
    document.getElementById('piBalance').textContent = userData.piBalance;
    document.getElementById('totalEarned').textContent = userData.totalEarned;
    document.getElementById('tasksCompleted').textContent = userData.tasksCompleted;
    document.getElementById('airdropPoints').textContent = userData.airdropPoints;
    document.getElementById('airdropTotalPoints').textContent = userData.airdropPoints;

    // Update profile
    document.getElementById('profilePiBalance').textContent = userData.piBalance + ' π';
    document.getElementById('profileTotalEarned').textContent = userData.totalEarned + ' π';
    document.getElementById('profileTasksDone').textContent = userData.tasksCompleted;

    // Update airdrop
    document.getElementById('airdropTier').textContent = userData.airdropTier;
    updateAirdropProgress();
    updatePointsBreakdown();

    // Update task statuses
    updateTaskStatuses();
    updateClaimTimer();

    // Update KYC status
    const kycStatus = document.getElementById('kycStatus');
    kycStatus.textContent = userData.kycVerified ? 'Verified' : 'Not Verified';
    kycStatus.className = userData.kycVerified ? 'status-badge completed' : 'status-badge pending';

    // Update channel status
    const channelStatus = document.getElementById('channelStatus');
    channelStatus.textContent = userData.joinedChannel ? 'Joined' : 'Not Joined';
    channelStatus.className = userData.joinedChannel ? 'status-badge completed' : 'status-badge pending';
}

function updateAirdropProgress() {
    const progressBar = document.getElementById('airdropProgress');
    let progress = 0;

    if (userData.airdropPoints >= 1000) {
        userData.airdropTier = 'Gold';
        progress = 100;
    } else if (userData.airdropPoints >= 500) {
        userData.airdropTier = 'Silver';
        progress = 66;
    } else if (userData.airdropPoints >= 100) {
        userData.airdropTier = 'Bronze';
        progress = 33;
    } else {
        progress = (userData.airdropPoints / 100) * 33;
    }

    progressBar.style.width = progress + '%';
    document.getElementById('airdropTier').textContent = userData.airdropTier;
}

function updatePointsBreakdown() {
    document.getElementById('pointsDaily').textContent = Math.min(userData.tasksCompleted * 2, 50) + ' points';
    document.getElementById('pointsTasks').textContent = userData.tasksCompleted * 10 + ' points';
    document.getElementById('pointsKYC').textContent = (userData.kycVerified ? 200 : 0) + ' points';
    document.getElementById('pointsChannel').textContent = (userData.joinedChannel ? 100 : 0) + ' points';
    document.getElementById('pointsReferrals').textContent = userData.referralCount * 50 + ' points';
}

function updateTaskStatuses() {
    const now = Date.now();
    const dailyClaimStatus = document.getElementById('dailyClaimStatus');
    const watchAdBtn = document.getElementById('watchAdBtn');
    const joinChannelBtn = document.getElementById('joinChannelBtn');
    const kycBtn = document.getElementById('kycBtn');

    // Daily claim status
    if (userData.lastClaim && (now - userData.lastClaim) < 24 * 60 * 60 * 1000) {
        dailyClaimStatus.textContent = 'Completed';
        dailyClaimStatus.className = 'status-badge completed';
    } else {
        dailyClaimStatus.textContent = 'Available';
        dailyClaimStatus.className = 'status-badge pending';
    }

    // Ad watch status
    if (userData.lastAdWatch && (now - userData.lastAdWatch) < 30 * 60 * 1000) {
        watchAdBtn.disabled = true;
        const remaining = Math.ceil((30 * 60 * 1000 - (now - userData.lastAdWatch)) / 1000 / 60);
        watchAdBtn.querySelector('.cooldown-timer').textContent = `${remaining}m`;
        watchAdBtn.querySelector('.cooldown-timer').style.display = 'block';
        watchAdBtn.querySelector('span').style.display = 'none';
    } else {
        watchAdBtn.disabled = false;
        watchAdBtn.querySelector('.cooldown-timer').style.display = 'none';
        watchAdBtn.querySelector('span').style.display = 'block';
    }

    // Channel join status
    if (userData.joinedChannel) {
        joinChannelBtn.disabled = true;
        joinChannelBtn.textContent = 'Joined';
    }

    // KYC status
    if (userData.kycVerified) {
        kycBtn.disabled = true;
        kycBtn.textContent = 'Verified';
    }
}

function updateClaimTimer() {
    const claimTimer = document.getElementById('claimTimer');
    const nextClaim = document.getElementById('nextClaim');
    const now = Date.now();

    if (userData.lastClaim && (now - userData.lastClaim) < 24 * 60 * 60 * 1000) {
        const remaining = 24 * 60 * 60 * 1000 - (now - userData.lastClaim);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        
        claimTimer.textContent = `${hours}h ${minutes}m`;
        claimTimer.style.display = 'block';
        nextClaim.textContent = `Next claim in ${hours}h ${minutes}m`;
    } else {
        claimTimer.style.display = 'none';
        nextClaim.textContent = 'Claim available now!';
    }
}

// Core Functions
function claimDailyReward() {
    const now = Date.now();
    
    if (userData.lastClaim && (now - userData.lastClaim) < 24 * 60 * 60 * 1000) {
        showNotification('Please wait 24 hours before claiming again', 'error');
        return;
    }

    userData.piBalance += 10;
    userData.totalEarned += 10;
    userData.tasksCompleted += 1;
    userData.airdropPoints += 2;
    userData.lastClaim = now;

    saveUserData();
    updateUI();
    showNotification('Successfully claimed 10 π!', 'success');
}

function watchAdvertisement() {
    const now = Date.now();
    
    if (userData.lastAdWatch && (now - userData.lastAdWatch) < 30 * 60 * 1000) {
        showNotification('Please wait 30 minutes before watching another ad', 'error');
        return;
    }

    // Simulate ad watching
    showNotification('Loading advertisement...', 'warning');
    
    setTimeout(() => {
        userData.piBalance += 1;
        userData.totalEarned += 1;
        userData.tasksCompleted += 1;
        userData.airdropPoints += 1;
        userData.lastAdWatch = now;

        saveUserData();
        updateUI();
        showNotification('+1 π earned from advertisement!', 'success');
    }, 3000);
}

function joinTelegramChannel() {
    if (userData.joinedChannel) {
        showNotification('You have already joined the channel', 'info');
        return;
    }

    tg.openTelegramLink('https://t.me/piswapchannel');
    
    // Simulate channel join verification
    setTimeout(() => {
        userData.piBalance += 50;
        userData.totalEarned += 50;
        userData.tasksCompleted += 1;
        userData.airdropPoints += 100;
        userData.joinedChannel = true;

        saveUserData();
        updateUI();
        showNotification('+50 π for joining our channel!', 'success');
    }, 2000);
}

function startKYCVerification() {
    if (userData.kycVerified) {
        showNotification('KYC already verified', 'info');
        return;
    }

    openKYCModal();
}

function completeKYC() {
    userData.piBalance += 100;
    userData.totalEarned += 100;
    userData.tasksCompleted += 1;
    userData.airdropPoints += 200;
    userData.kycVerified = true;

    saveUserData();
    updateUI();
    closeKYCModal();
    showNotification('KYC verified successfully! +100 π', 'success');
}

async function buyPiSwap(amount, price) {
    if (!tonWallet.isConnected) {
        showNotification('Please connect your TON wallet first', 'error');
        return;
    }

    if (tonWallet.balance < price) {
        showNotification('Insufficient TON balance', 'error');
        return;
    }

    // Show transaction modal
    const modal = document.getElementById('transactionModal');
    const tonAmount = document.getElementById('transactionTonAmount');
    const piAmount = document.getElementById('transactionPiAmount');
    const status = document.getElementById('transactionStatus');

    tonAmount.textContent = price + ' TON';
    piAmount.textContent = amount + ' π';
    status.textContent = 'Initializing transaction...';
    openModal('transactionModal');

    try {
        status.textContent = 'Processing transaction...';
        
        // Simulate transaction processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const transaction = await tonWallet.sendTransaction(price);
        
        if (transaction.success) {
            status.textContent = 'Transaction completed successfully!';
            
            // Add Pi Swap tokens to user balance
            userData.piBalance += amount;
            userData.totalEarned += amount;
            
            saveUserData();
            updateUI();
            
            setTimeout(() => {
                closeModal('transactionModal');
                closeShopSheet();
                showNotification(`Successfully purchased ${amount} π!`, 'success');
            }, 2000);
        }
    } catch (error) {
        status.textContent = `Transaction failed: ${error.message}`;
        setTimeout(() => {
            closeModal('transactionModal');
        }, 3000);
    }
}

function verifyAirdrop() {
    showComingSoon();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 4000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function openKYCModal() {
    openModal('kycModal');
}

function closeKYCModal() {
    closeModal('kycModal');
}

function openShopSheet() {
    document.getElementById('shopSheet').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeShopSheet() {
    document.getElementById('shopSheet').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function showComingSoon() {
    openModal('comingSoonModal');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app
    loadUserData();
    loadUserProfile();

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding screen
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.getElementById(page + 'Screen').classList.add('active');
        });
    });

    // Wallet connection
    document.getElementById('connectWalletBtn').addEventListener('click', async () => {
        try {
            await tonWallet.connect();
            userData.walletConnected = true;
            saveUserData();
            showNotification('TON wallet connected successfully!', 'success');
        } catch (error) {
            showNotification('Failed to connect wallet: ' + error.message, 'error');
        }
    });

    // Daily claim
    document.getElementById('dailyClaimBtn').addEventListener('click', claimDailyReward);

    // Shop
    document.getElementById('openShopBtn').addEventListener('click', openShopSheet);
    document.getElementById('closeShopBtn').addEventListener('click', closeShopSheet);

    // Buy buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.getAttribute('data-amount'));
            const option = this.closest('.buy-option');
            const price = parseFloat(option.getAttribute('data-price'));
            buyPiSwap(amount, price);
        });
    });

    // Tasks
    document.getElementById('watchAdBtn').addEventListener('click', watchAdvertisement);
    document.getElementById('joinChannelBtn').addEventListener('click', joinTelegramChannel);
    document.getElementById('kycBtn').addEventListener('click', startKYCVerification);
    document.getElementById('inviteBtn').addEventListener('click', showComingSoon);

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(action => {
        action.addEventListener('click', function() {
            const actionType = this.getAttribute('data-action');
            switch(actionType) {
                case 'watchAd':
                    watchAdvertisement();
                    break;
                case 'invite':
                    showComingSoon();
                    break;
                case 'kyc':
                    startKYCVerification();
                    break;
            }
        });
    });

    // KYC Modal
    document.getElementById('submitKycBtn').addEventListener('click', completeKYC);
    document.getElementById('cancelKycBtn').addEventListener('click', closeKYCModal);
    document.getElementById('closeKycBtn').addEventListener('click', closeKYCModal);

    // Transaction Modal
    document.getElementById('cancelTransactionBtn').addEventListener('click', () => closeModal('transactionModal'));
    document.getElementById('confirmTransactionBtn').addEventListener('click', () => {
        // Transaction confirmation is handled in buyPiSwap function
    });

    // Coming Soon Modal
    document.getElementById('closeSoonBtn').addEventListener('click', () => closeModal('comingSoonModal'));

    // Airdrop verify
    document.getElementById('verifyAirdropBtn').addEventListener('click', verifyAirdrop);

    // Overlay click
    document.getElementById('overlay').addEventListener('click', function() {
        closeShopSheet();
        closeModal('kycModal');
        closeModal('transactionModal');
        closeModal('comingSoonModal');
    });

    // KYC Setting click
    document.getElementById('kycSetting').addEventListener('click', startKYCVerification);
});

function loadUserProfile() {
    const nameElement = document.getElementById('profileName');
    const usernameElement = document.getElementById('profileUsername');
    const avatarElement = document.getElementById('profileAvatar');
    const premiumBadge = document.getElementById('profilePremiumBadge');

    nameElement.textContent = 'User';
    usernameElement.textContent = '@user';
    avatarElement.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        if (userName) nameElement.textContent = userName;
        
        if (user.username) {
            usernameElement.textContent = '@' + user.username;
        }
        
        if (user.photo_url) {
            avatarElement.src = user.photo_url;
        }

        if (user.is_premium) {
            premiumBadge.style.display = 'block';
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize timers
setInterval(updateClaimTimer, 60000); // Update every minute
setInterval(updateTaskStatuses, 1000); // Update every second for cooldown timers
