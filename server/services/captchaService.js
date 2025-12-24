import axios from 'axios';

const CAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || 'test-secret';

export const verifyCaptcha = async (token) => {
  try {
    // Using hCaptcha verification
    const response = await axios.post(
      'https://hcaptcha.com/siteverify',
      new URLSearchParams({
        secret: CAPTCHA_SECRET,
        response: token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      success: response.data.success,
      score: response.data.score || 1,
      challengeTs: response.data.challenge_ts,
      hostname: response.data.hostname,
    };
  } catch (error) {
    console.error('CAPTCHA verification error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default verifyCaptcha;
