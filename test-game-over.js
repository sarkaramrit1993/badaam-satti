// Test: Game Over Functionality
// This script tests that game ends properly and scores are calculated

const { test, expect } = require('@playwright/test');

test.describe('Game Over Flow', () => {
    const BASE_URL = 'http://localhost:8000';
    
    test('should complete game, show scores, and display modal', async ({ browser }) => {
        // Create two browser contexts (two players)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        let roomCode = '';
        
        try {
            console.log('🧪 Test: Starting game over flow test...');
            
            // ==========================================
            // STEP 1: Player 1 creates room
            // ==========================================
            console.log('📝 Step 1: Player 1 creating room...');
            await page1.goto(BASE_URL);
            await page1.waitForLoadState('networkidle');
            
            // Play as guest
            await page1.click('text=Play as Guest');
            await page1.waitForTimeout(2000);
            
            // Create room
            await page1.click('text=Create Room');
            await page1.waitForTimeout(1000);
            
            await page1.fill('#roomNameInput', 'Test Game Over');
            await page1.click('button:has-text("Create Room")');
            await page1.waitForTimeout(2000);
            
            // Get room code
            const roomCodeElement = await page1.locator('.room-code-display, .code-display, strong').first();
            roomCode = await roomCodeElement.textContent();
            console.log('✅ Room created:', roomCode);
            
            // ==========================================
            // STEP 2: Player 2 joins room
            // ==========================================
            console.log('📝 Step 2: Player 2 joining room...');
            await page2.goto(BASE_URL);
            await page2.waitForLoadState('networkidle');
            
            await page2.click('text=Play as Guest');
            await page2.waitForTimeout(2000);
            
            await page2.click('text=Join Room');
            await page2.waitForTimeout(1000);
            
            await page2.fill('input[placeholder*="room code" i], input[placeholder*="code" i]', roomCode);
            await page2.click('button:has-text("Join Room"), button:has-text("Join")');
            await page2.waitForTimeout(2000);
            
            console.log('✅ Player 2 joined');
            
            // ==========================================
            // STEP 3: Both players ready
            // ==========================================
            console.log('📝 Step 3: Players getting ready...');
            await page1.click('button:has-text("Ready")');
            await page2.click('button:has-text("Ready")');
            await page1.waitForTimeout(1000);
            
            console.log('✅ Both players ready');
            
            // ==========================================
            // STEP 4: Start game
            // ==========================================
            console.log('📝 Step 4: Starting game...');
            await page1.click('button:has-text("Start Game")');
            await page1.waitForTimeout(3000);
            
            // Should be on game page
            expect(page1.url()).toContain('game.html');
            expect(page2.url()).toContain('game.html');
            console.log('✅ Game started');
            
            // ==========================================
            // STEP 5: Simulate game completion
            // ==========================================
            console.log('📝 Step 5: Simulating game to completion...');
            
            // This will take multiple turns - just play valid cards
            let turnsPlayed = 0;
            const maxTurns = 52; // Full deck
            
            while (turnsPlayed < maxTurns) {
                // Check which page has active turn
                const page1Turn = await page1.evaluate(() => {
                    const indicator = document.getElementById('turnIndicator');
                    return indicator && indicator.textContent.includes('Your Turn');
                });
                
                const page2Turn = await page2.evaluate(() => {
                    const indicator = document.getElementById('turnIndicator');
                    return indicator && indicator.textContent.includes('Your Turn');
                });
                
                const currentPage = page1Turn ? page1 : (page2Turn ? page2 : null);
                
                if (!currentPage) {
                    console.log('No active turn detected, checking if game ended...');
                    break;
                }
                
                // Try to play a card or pass
                const played = await currentPage.evaluate(() => {
                    const playableCard = document.querySelector('.card.playable');
                    if (playableCard) {
                        playableCard.click();
                        return true;
                    } else {
                        const passBtn = document.getElementById('passBtn');
                        if (passBtn && !passBtn.disabled) {
                            passBtn.click();
                            return true;
                        }
                    }
                    return false;
                });
                
                if (played) {
                    turnsPlayed++;
                    await currentPage.waitForTimeout(500);
                    console.log(`  Turn ${turnsPlayed} played`);
                } else {
                    console.log('  No moves available, waiting...');
                    await currentPage.waitForTimeout(1000);
                }
                
                // Check if game finished
                const gameFinished1 = await page1.evaluate(() => {
                    return document.getElementById('gameOverModal') && 
                           !document.getElementById('gameOverModal').classList.contains('hidden');
                });
                
                const gameFinished2 = await page2.evaluate(() => {
                    return document.getElementById('gameOverModal') && 
                           !document.getElementById('gameOverModal').classList.contains('hidden');
                });
                
                if (gameFinished1 || gameFinished2) {
                    console.log('✅ Game finished! Modal appeared!');
                    break;
                }
            }
            
            // ==========================================
            // STEP 6: Verify game over
            // ==========================================
            console.log('📝 Step 6: Verifying game over...');
            await page1.waitForTimeout(2000);
            
            // Check if modal is visible on both pages
            const modal1Visible = await page1.evaluate(() => {
                const modal = document.getElementById('gameOverModal');
                return modal && !modal.classList.contains('hidden');
            });
            
            const modal2Visible = await page2.evaluate(() => {
                const modal = document.getElementById('gameOverModal');
                return modal && !modal.classList.contains('hidden');
            });
            
            console.log('Modal visible - Page 1:', modal1Visible);
            console.log('Modal visible - Page 2:', modal2Visible);
            
            expect(modal1Visible || modal2Visible).toBeTruthy();
            
            // ==========================================
            // STEP 7: Check scores displayed
            // ==========================================
            console.log('📝 Step 7: Checking scores...');
            
            const page = modal1Visible ? page1 : page2;
            
            const scoresDisplayed = await page.evaluate(() => {
                const results = document.getElementById('gameResults');
                if (!results) return false;
                
                const resultItems = results.querySelectorAll('.result-item');
                console.log('Result items found:', resultItems.length);
                
                return resultItems.length >= 2; // At least 2 players
            });
            
            console.log('Scores displayed:', scoresDisplayed);
            expect(scoresDisplayed).toBeTruthy();
            
            // ==========================================
            // STEP 8: Verify console logs
            // ==========================================
            console.log('📝 Step 8: Checking console for debug logs...');
            
            const consoleMessages1 = [];
            page1.on('console', msg => consoleMessages1.push(msg.text()));
            
            const hasGameOverLog = consoleMessages1.some(msg => 
                msg.includes('handleGameOver') || 
                msg.includes('Game over detected') ||
                msg.includes('showGameOverModal')
            );
            
            console.log('Has game over debug logs:', hasGameOverLog);
            
            // ==========================================
            // RESULTS
            // ==========================================
            console.log('\n🎉 TEST RESULTS:');
            console.log('═══════════════════════════════════════');
            console.log('✅ Room created:', roomCode);
            console.log('✅ Players joined: 2');
            console.log('✅ Game started successfully');
            console.log('✅ Turns played:', turnsPlayed);
            console.log('✅ Game over modal shown:', modal1Visible || modal2Visible);
            console.log('✅ Scores displayed:', scoresDisplayed);
            console.log('═══════════════════════════════════════');
            console.log('✅ GAME OVER FLOW: WORKING!');
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
});

