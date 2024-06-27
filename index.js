const puppeteer = require('puppeteer');
const axios = require('axios');
const crypto = require('crypto');
const cheerio = require('cheerio');
const fs = require('fs');
const inquirer = require('inquirer');

async function createTempEmailAccount() {
    const domainResponse = await axios.get('https://api.mail.tm/domains');
    const domains = domainResponse.data['hydra:member'];
    const randomUsername = crypto.randomBytes(8).toString('hex');
    const email = `${randomUsername}@${domains[0].domain}`;
    const password = crypto.randomBytes(10).toString('hex');

    await axios.post('https://api.mail.tm/accounts', {
        address: email,
        password: password
    });

    return { email, password };
}

async function getEmailContent(email, emailPassword) {
    const tokenResponse = await axios.post('https://api.mail.tm/token', {
        address: email,
        password: emailPassword
    });

    const token = tokenResponse.data.token;
    let emailContent = null;

    for (let i = 0; i < 10; i++) {
        try {
            const emailResponse = await axios.get('https://api.mail.tm/messages', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (emailResponse.data['hydra:member'].length > 0) {
                const messageId = emailResponse.data['hydra:member'][0]['@id'];
                const messageResponse = await axios.get(`https://api.mail.tm${messageId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                emailContent = messageResponse.data['html'];
                break;
            }
        } catch (error) {
            console.error('Error fetching email:', error);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return emailContent;
}

async function extractVerificationCode(emailContent) {
    const $ = cheerio.load(emailContent);
    const codeMatch = $('body').text().match(/(\d{6})/);
    return codeMatch ? codeMatch[1] : null;
}

async function registerDiscord(email, password) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://discord.com/register');

    await page.type('input[name="email"]', email);
    await page.type('input[name="username"]', 'RandomUser' + Math.floor(Math.random() * 1000));
    await page.type('input[name="password"]', password);
    await page.type('input[name="date_of_birth"]', '01011990');

    await page.click('button[type="submit"]');

    console.log(`Discord account created: ${email} | ${password}`);

    await page.waitForTimeout(30000);
    const emailContent = await getEmailContent(email, emailPassword);
    const verificationCode = await extractVerificationCode(emailContent);

    if (verificationCode) {
        await page.type('input[name="verification_code"]', verificationCode);
        await page.click('button[type="submit"]');
        console.log('Discord account verified:', email);

        fs.appendFileSync('accounts.txt', `Discord - Email: ${email}, Password: ${password}\n`);
    } else {
        console.log('Failed to get verification code for Discord:', email);
    }

    await browser.close();
}

async function registerGithub(email, password) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://github.com/join');

    await page.type('#user_login', 'RandomUser' + Math.floor(Math.random() * 1000));
    await page.type('#user_email', email);
    await page.type('#user_password', password);
    await page.click('button[type="submit"]');

    console.log(`GitHub account created: ${email} | ${password}`);

    await page.waitForTimeout(30000);
    const emailContent = await getEmailContent(email, emailPassword);

    if (emailContent) {
        const $ = cheerio.load(emailContent);
        const verificationLink = $('a:contains("Verify your email address")').attr('href');

        if (verificationLink) {
            await page.goto(verificationLink);
            console.log('GitHub account verified:', email);

            fs.appendFileSync('accounts.txt', `GitHub - Email: ${email}, Password: ${password}\n`);
        } else {
            console.log('Failed to get verification link for GitHub:', email);
        }
    } else {
        console.log('Failed to get verification email for GitHub:', email);
    }

    await browser.close();
}

async function registerFacebook(email, password) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.facebook.com/');

    await page.type('input[name="firstname"]', 'Random');
    await page.type('input[name="lastname"]', 'User');
    await page.type('input[name="reg_email__"]', email);
    await page.type('input[name="reg_passwd__"]', password);
    await page.select('select[name="birthday_day"]', '1');
    await page.select('select[name="birthday_month"]', '1');
    await page.select('select[name="birthday_year"]', '1990');
    await page.click('input[name="sex"][value="2"]');
    await page.click('button[name="websubmit"]');

    console.log(`Facebook account created: ${email} | ${password}`);

    await page.waitForTimeout(30000);
    const emailContent = await getEmailContent(email, emailPassword);

    if (emailContent) {
        const $ = cheerio.load(emailContent);
        const verificationLink = $('a:contains("Confirm your account")').attr('href');

        if (verificationLink) {
            await page.goto(verificationLink);
            console.log('Facebook account verified:', email);

            fs.appendFileSync('accounts.txt', `Facebook - Email: ${email}, Password: ${password}\n`);
        } else {
            console.log('Failed to get verification link for Facebook:', email);
        }
    } else {
        console.log('Failed to get verification email for Facebook:', email);
    }

    await browser.close();
}

async function registerTwitter(email, password) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://twitter.com/i/flow/signup');

    await page.type('input[name="name"]', 'Random User');
    await page.type('input[name="email"]', email);
    await page.select('select[name="month"]', '1');
    await page.select('select[name="day"]', '1');
    await page.select('select[name="year"]', '1990');
    await page.click('div[data-testid="ocfEnterTextNextButton"]');

    await page.waitForTimeout(30000);
    const emailContent = await getEmailContent(email, emailPassword);

    if (emailContent) {
        const verificationCode = await extractVerificationCode(emailContent);
        if (verificationCode) {
            await page.type('input[name="verfication_code"]', verificationCode);
            await page.click('div[data-testid="ocfVerifyEmailNextButton"]');

            await page.type('input[name="password"]', password);
            await page.click('div[data-testid="ocfEnterTextNextButton"]');
            console.log('Twitter account verified:', email);

            fs.appendFileSync('accounts.txt', `Twitter - Email: ${email}, Password: ${password}\n`);
        } else {
            console.log('Failed to get verification code for Twitter:', email);
        }
    } else {
        console.log('Failed to get verification email for Twitter:', email);
    }

    await browser.close();
}

async function registerInstagram(email, password) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.instagram.com/accounts/emailsignup/');

    await page.type('input[name="emailOrPhone"]', email);
    await page.type('input[name="fullName"]', 'Random User');
    await page.type('input[name="username"]', 'RandomUser' + Math.floor(Math.random() * 1000));
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');

    console.log(`Instagram account created: ${email} | ${password}`);

    await page.waitForTimeout(30000);
    const emailContent = await getEmailContent(email, emailPassword);

    if (emailContent) {
        const $ = cheerio.load(emailContent);
        const verificationLink = $('a:contains("Confirm your email address")').attr('href');

        if (verificationLink) {
            await page.goto(verificationLink);
            console.log('Instagram account verified:', email);

                       fs.appendFileSync('accounts.txt', `Instagram - Email: ${email}, Password: ${password}\n`);
       } else {
           console.log('Failed to get verification email for Instagram:', email);
       }

       await browser.close();
   }

   async function main() {
       const { accountType } = await inquirer.prompt([
           {
               type: 'list',
               name: 'accountType',
               message: 'Select the type of account to generate:',
               choices: ['Discord', 'GitHub', 'Facebook', 'Twitter', 'Instagram']
           }
       ]);

       while (true) {
           try {
               const { email, password: emailPassword } = await createTempEmailAccount();
               const password = crypto.randomBytes(10).toString('hex');

               switch (accountType) {
                   case 'Discord':
                       await registerDiscord(email, password, emailPassword);
                       break;
                   case 'GitHub':
                       await registerGithub(email, password, emailPassword);
                       break;
                   case 'Facebook':
                       await registerFacebook(email, password, emailPassword);
                       break;
                   case 'Twitter':
                       await registerTwitter(email, password, emailPassword);
                       break;
                   case 'Instagram':
                       await registerInstagram(email, password, emailPassword);
                       break;
               }

               console.log(`Account details saved: ${email} | ${password}`);
           } catch (error) {
               console.error('Error creating account:', error);
           }

           const { continueCreating } = await inquirer.prompt([
               {
                   type: 'confirm',
                   name: 'continueCreating',
                   message: 'Do you want to create another account?',
                   default: true
               }
           ]);

           if (!continueCreating) {
               break;
           }
       }
   }

   main();
