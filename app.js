const got = require('got')
const axios = require('axios')

const { cookie, aid, uuid, _signature, PUSH_PLUS_TOKEN } = require('./config.local')

const config = {
  base: 'https://api.juejin.cn',
  api: {
    // 查询今日是否已经签到
    getTodayStatus: `/growth_api/v1/get_today_status?aid=${aid}&uuid=${uuid}&_signature=${_signature}`,
    // 签到
    checkIn: `/growth_api/v1/check_in?aid=${aid}&uuid=${uuid}&_signature=${_signature}`,
    // 获取今天是否可以免费抽奖
    getLotteryConfig: `/growth_api/v1/lottery_config/get?aid=${aid}&uuid=${uuid}&_signature=${_signature}`,
    // 抽奖
    drawLottery: `/growth_api/v1/lottery/draw?aid=${aid}&uuid=${uuid}`
  }
}

const PUSH_URL = 'http://www.pushplus.plus/send' // pushplus 推送api

// 获取今天免费抽奖的次数
const getTodayDrawStatus = async () => {
  const { base, api } = config;
  let { data } = await axios({
    method: 'GET',
    url: `${base}${api.getLotteryConfig}`,
    headers: {
      cookie
    }
  });
  if (data.err_no) {
    return { isDrawed: false, ...data }
  }
  return { isDrawed: data.data.free_count === 0, ...data }
}

// 抽奖
const draw = async () => {
  let { err_no, isDrawed } = await getTodayDrawStatus();
  if (err_no) return {
    data: {
      err_no: 1,
      err_msg: '查询抽奖次数失败',
      data: null
    }
  };

  if (isDrawed) return {
    data: {
      err_no: 1,
      err_msg: '今日已无免费抽奖次数',
      data: null
    }
  };

  const { base, api } = config;
  const result = await axios({
    method: 'POST',
    url: `${base}${api.drawLottery}`,
    headers: {
      cookie
    }
  });
  return result;
}

// 签到
async function checkIn() {
  const { base, api } = config;
  const result = await axios({
    method: 'POST',
    url: `${base}${api.checkIn}`,
    headers: {
      cookie
    }
  })
  console.log(result.data)
  if (!result || result?.data?.err_no) {
    // 签到报错
    console.log('签到报错')
    handlePush(result?.data?.err_msg)
  } else {
    // 签到成功
    handlePush(`签到成功，获得${result?.data?.incr_point}矿石，当前矿石总数为${result?.data?.sum_point}`)
  }

  setTimeout(async () => {
    const drawResult = await draw();
    if (!drawResult || drawResult?.data?.err_no) {
      // 免费抽奖报错
      console.log('免费抽奖报错')
      handlePush(drawResult?.data?.err_msg)
      return;
    } else {
      handlePush(drawResult?.data)
    }
  }, 1000)
}

// push
async function handlePush(desp) {
  const body = {
    token: `${PUSH_PLUS_TOKEN}`,
    title: `签到结果`,
    content: `${desp}`,
    template: 'json'
  };
  const res = await got.post(PUSH_URL, {
    json: body
  })
}

checkIn()