/**
 * Script to add sample ads to the database
 * Run with: node scripts/addSampleAds.js
 */

require('dotenv').config();
const Ad = require('../models/Ad');

const sampleAds = [
  {
    title: 'Get 100 USDT Welcome Bonus',
    description: 'Join Binance, the world\'s largest crypto exchange. Trade 350+ cryptocurrencies with the lowest fees and get up to 100 USDT welcome bonus!',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
    buttonText: 'Claim Bonus Now',
    buttonLink: 'https://www.binance.com/en/register',
    isActive: true,
    displayOrder: 1
  },
  {
    title: 'Bybit - 30 USDT Deposit Bonus',
    description: 'Leading derivatives exchange with up to 100x leverage. Get 30 USDT deposit bonus and access advanced trading tools.',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    buttonText: 'Get Started',
    buttonLink: 'https://www.bybit.com/en-US/invite',
    isActive: true,
    displayOrder: 2
  },
  {
    title: 'OKX - 50 USDT Welcome Bonus',
    description: 'Comprehensive crypto platform with spot, futures, and DeFi. Earn up to 20% APY and get 50 USDT welcome bonus.',
    imageUrl: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400',
    buttonText: 'Join Now',
    buttonLink: 'https://www.okx.com/join',
    isActive: true,
    displayOrder: 3
  }
];

async function addSampleAds() {
  try {
    console.log('Adding sample ads...\n');
    
    for (const adData of sampleAds) {
      const ad = await Ad.create(adData);
      console.log(`✓ Created ad: ${ad.title}`);
      console.log(`  ID: ${ad.id}`);
      console.log(`  Link: ${ad.buttonLink}\n`);
    }
    
    console.log('✓ All sample ads added successfully!');
    console.log('\nYou can now view them at: http://localhost:3000/referrals');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample ads:', error);
    process.exit(1);
  }
}

addSampleAds();
