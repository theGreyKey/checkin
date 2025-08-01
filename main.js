const glados = async () => {
  const notice = []
  if (!process.env.GLADOS) return
  for (const cookie of String(process.env.GLADOS).split('\n')) {
    if (!cookie) continue
    try {
      const common = {
        'cookie': cookie,
        'referer': 'https://glados.rocks/console/checkin',
        'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
      }

      const action = await fetch('https://glados.rocks/api/user/checkin', {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json' },
        body: '{"token":"glados.one"}',
      }).then((r) => r.json());
  
      console.log('action:', action);
      if (action?.code) throw new Error(action?.message);
      
      const status = await fetch('https://glados.rocks/api/user/status', {
        method: 'GET',
        headers: { ...common },
      }).then((r) => r.json());
      
      console.log('status:', status);
      if (status?.code) throw new Error(status?.message);

      const balance = action?.list?.[0]?.balance ? Number(action.list[0].balance) : 0;
      const totalChange = action?.list?.reduce((sum, item) => {
        const changeValue = parseFloat(item.change);
        return sum + (isNaN(changeValue) ? 0 : changeValue);
      }, 0);
      const redeemDays = Math.floor(totalChange / 100) * 10;
      
      notice.push(
        'Checkin OK',
        `${action?.message}`,
        `Left Days: ${Number(status?.data?.leftDays)}`,
        `Accumulated Check-in Points: ${balance}`,
        `Successfully Redeemed Days: ${redeemDays}`
      );
    } catch (error) {
      notice.push(
        'Checkin Error',
        `${error}`,
        `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`
      )
    }
  }
  return notice
}

const notify = async (notice) => {
  if (!process.env.NOTIFY || !notice) return
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        for (const line of notice) {
          console.log(line)
        }
      } else if (option.startsWith('wxpusher:')) {
        await fetch(`https://wxpusher.zjiecode.com/api/send/message`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            appToken: option.split(':')[1],
            summary: notice[0],
            content: notice.join('<br>'),
            contentType: 3,
            uids: option.split(':').slice(2),
          }),
        })
      } else if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      } else if (option.startsWith('qyweixin:')) {
        const qyweixinToken = option.split(':')[1]
        const qyweixinNotifyRebotUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + qyweixinToken;
        await fetch(qyweixinNotifyRebotUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
                content: notice.join('<br>')
            }
          }),
        })
      } else {
        // fallback
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option,
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      }
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  await notify(await glados())
}

main()
