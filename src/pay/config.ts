// Creem 收款配置（MoR：税费/支付由 Creem 处理；大陆商户可用 Alipay 提现）
// 接入步骤:
//  1. 注册 https://creem.io → 创建产品 "Pro Monthly"($4.9/月) 与 "Pro Yearly"($39/年)
//  2. 每个产品开启 License Key Management(激活码), 设置激活上限(建议 3 台/码)
//  3. 把下方 2 个占位符替换为真实产品 ID(形如 prod_xxxxxx), 然后改 CREEM_CONFIGURED 判定
// 结账通过 Cloudflare Pages Function 代理创建 checkout session:
//   POST /api/checkout  body: { productId }  → 返回 { checkoutUrl } → 前端跳转
// 激活码验证同样走代理: POST /api/licenses/activate
//   Function 环境变量: CREEM_API_KEY(测试用 test key / 上线用 prod key), CREEM_API_BASE
export const CREEM_PRODUCTS: Record<'monthly' | 'yearly', string> = {
  monthly: 'prod_4uIAoE6h0iKFPYsUoLrI6j',
  yearly: 'prod_bpMkyNVdt5gKcA9fhoG6F',
};

export const CREEM_CONFIGURED =
  CREEM_PRODUCTS.monthly.startsWith('prod_') && !CREEM_PRODUCTS.monthly.includes('YOUR') &&
  CREEM_PRODUCTS.yearly.startsWith('prod_') && !CREEM_PRODUCTS.yearly.includes('YOUR');

export type ProPlan = keyof typeof CREEM_PRODUCTS;