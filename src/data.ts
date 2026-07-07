import { MatchPost, Court, UserProfile, GameRecord, CustomIcon } from './types';

// Hotlinked Image Constants
export const IMAGES = {
  beijingMap: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQb5nU4DlmUBcu10QowBMoeLHOCfgVOKLX33Rh-hRHI-RFYz5Gd3UtUhzcocDX97rgVYhOq91aD7k2wGZT5cHBl2NlKxahmr0O3vqhjV7MerJXW3sVWhrJ93VAhx1iTq6BIDkU9mRIhtjCTNhiGftzmpVKdVWFZJK6TxLslnwKgHa1g_F0MZGNbBSVV2ulLu2aNq13zhBt1p4TSOhMeOLT5yMmyQVL1Snr9yE62QNKDFVzSj23yyKDyFBAMpSPF3Wpzv5sMNS7CU8p',
  shanghaiMap: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1tyXm41YwH4oS_d0ocjXRIWDm8m-Ka4Mo934DIsfFkzYZRZn1pqMKN8GQpZWGlJKaCQoefj9o4VTn-k2J_0pPGdyy1h0PtVimCE2QQpnz7LpxNSteBGildWJ8BxVGdfvVrA5cznxMPkOk3PxSAt-WU_rn-FeeWoPR25_y7PsXAP-CJKUlbbJ_jCG-OaM4itFe35bMMfucF9K36mbQR5UErwHLanXppAXBSiQGLMF8K0jI0yuCCK6OdoELa2QQiW-51ZRtVRhtBkHW',
  
  // User Avatars
  dashengAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5TTFm6M3c5_KdEJi4VyD_hsx4kSLk36naGJAaYDJ9E6UMd8f2GaeaHTBaUihi0grxY6J4CPLyq2poUm7nAJBD3-Y-5nBV2O24WtYGW41Y0jf_o5syW5hicW4UYIvRLwAxfD4km3fmtDQPnHKDTVfCbw17JXUkFkP3tcTXqf8JG5WQNxpjLW8qgDLbXUmI0TV5hK_YfkIB0P3tj5WXezqMtG52U8ryTHUsmZWnvFgxJp23jPM8zf-yd6r6H5Kb-lwfbfvVwAklSnzx',
  laoZhangAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmU5OPtYCOkItHrYuUolHWQGth4GP2iWwgUVSjKXG084OVi5RuKM7aGtENY1aFxpjE4cMaXHmXodVN8eVIpbE70pkA5cHa3_rPCDoQ99z7f-ZgftRFmy3xHmv_R5kBkLY1zA6gR_98r7rGTdvGPiGkjEAVMtJMEkfnMkEws-BwelEjNFGe6wv_unMEPKYSX2NzX3ykyHyBGEBJa-AUQ_mXYLu7fWdqUzZZZrgIFqly8gmlEs6Ik0KKja2gdG0ut-XyW1bcMTTMO4dX',
  xiaoLiAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoKE-TN-u1P-qGg4KynvLVZ9V3G_pbcxzO1UO-pK4M0BX_8HgrR_Lh9lndXrfs5H1R3ZLpzfqYF_YPORVoF2xH8Z0l8t-xmUv6zw6aUSR0invkB27KzNLscUdfxwMSjhIZRXfX66KwTyw16L1R_Oq4u2bpdPcZXF4DpSMVDbf2U4RjtXHIKit7lRQLSgtZ3dGYURT2VXx4mD_BmH8CoAk1fUal40dy_QV1jVCZAshoFBwO7xSccbFWPeegnqdVDj43QvhC8Tx_6ZLB',
  coachWangAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJMGgqODjzAsY_xzLU5u2KT4hkquRmWeh1YcEaZyOCHt371Gvbft7BCS62N19-4WBIfbkpw9kNlhGq_TFwWOmgdd7IjM7mWCnAe-bMHCA83hP4RPptWLtpfatTwMmi0ddlrYKOlq1w6Ab5LT25ovYEtmWndw8DVBcxSx32zF8GY-V281CWPrTRKZIMEnfn9NCXYB6B8WIedBNVcYFdnZgAPTEtkEx1sR_PHtW1G3XI_xPCjETldBfaoIQa2Y1MrcqUkx4OpftBRaUM',
  coachZhangAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9GX6Tq8zJv_-R-2DelY-qcrEnFb6zLQLGp_OTdfeoQUpj7mCkfkq-3cO9Cvl-hBbJDFCplfoDM6JKu2cPBYOkOGh9Bz6_-k-iqGsJgR3pD8em3xGravw17n5LILSuEaZMwXWW6X07EQPD8oyB6khVhQnpbHe6lQOQDhxS_6b372vftV6sW44Ze7zWwd50uelMFdrV-TR9hAC6Tv-2UfyJuvmhlzWABfCP7aBYUMekJTYK4y0vnLlJj-77RpsHCUnI0EgZQWP2P6sA',
  settingsProfileAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXiJiH8JGBRjZ8uEf3j_mWdysGw6lkyyX8M0_B_UXxPbmKha6d5Y-DOtJIiY8UDv3A-zYiu69HQ6dzsj9boBJ4hRSWzkNnfIrEkT-GLbncLzcr1wTJGR1l0e_i831799C8ZtAOv78TnwQ27JXdChualuy5rBlJOy-unjQGnM5tik3PwqxVDJ0orLMUxWSj3vAXEeGnnjnfa60TaVdzuCjhiA3q1SSMNSk9_QkZ5-uBFBgYzl2knyv-4rbcO31WDh2MaNBeW1NZoClT',

  // Participant/Map Overlays
  player1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVp2xJTln7WOwxZuOIAe_WEmRp_lWJNfvqZzi_feEGzg0CVAKPskVSYnRDc4zkAg_tXa35skf948yMFZAoTLsbyu5i88zDOnIfUfl9MsgOT7gdtCx_h11vGQG9BlO9IbFpHw1LsGC686MbZOlEbG3C62eTorCqk6sOeVc-yMxhjX47Gy6Gz74jKUPELhcKhw_LgZNI5kLzEj4YmAenMslVxrMQci3cI_jDZ1L7-PFAs1BIwSPLy_8Oa2QB3_ZxttZTfdvw0yFZWT0Z',
  player2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAthFFaK8KfcWw6vG0Fi-NxR_w1J0zBDmbcXvn1ITBT8r3jaYcio4LWX4Ss_SzUPdb0KvkPU3Q-jlDyv64gQrVZUnU8henc_edrp7_7TYNmXoGbuAcOjJN5LCewcAbcp4qPT2xSJ5DQ9_e87kpmMAOm5ehW1lxIy4I2aa8wHaTOr7kYS-NjtqnkKksdMLuRoghIzlhadTrI7hozF4CDx3wloSgtM5fXgbb3aMoH2j_NC4qFKceOOCE88KLVvgcLmJKca5cckXQv1aBh',
  player3: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBD6mgejzwycIKjAlcsZx5TJmj0OP8DkRgufA6WMGjJb36D9S_GxGANIqeav5i5Tewfc9jYkZlshEPEN5A5ZD1OZEsG4N5RB_WBBhTWqAf95bRAS7j_LAph_gq-d3E-twzQvakU5hAskrxCWwGsHdxD18cUsPtoMjXKNmdIOm89nfw1g1sCiG-6fx8y6R4tix3evM_7yhCOtnaIjFuBTsK0AKD_aqjfVdRUUGmUVMngw76I3JdiAaS2hjaCI6A6XkqY0eLr0bgr-o4Y',

  // Checked In
  checkedIn1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByWeIbpvjGP1GDwIeKEVR1-LFw3jv8cvNZbrt5NGwDweG9zf5EHewDwrSXYvGY17q-lAVaJ82WlBwT_Vd-OLXT3NP8od6uJGLQgaJ9kxbY3VIN5MeBy9UFyMxDapvB4XztPmqNniEjgcmAkXW1su_J1UVd5_Daiz7R6FGP7I5NMHc_HrDwASDQkiTAXdqmT2_dNMAB375KteDfcyDURycaJK0okUPFfXs4bFkTAQXiXziaBbCrhHA5fCFjdhEgv7pcNGbttnNWxUOJ',
  checkedIn2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqA4KXx0R9CEEXsRtYZ4M6i1phe5_3M7MAvxwHTHlnQpkAm37FXDi-tbcyAhrEHTRiPpsVlBCiN-sG0CWMIphkduwqhuH0i99QBNsiE0Hs2ZAbRQDLefUBAFc25DI4N9Z1yitQOJsPtZFy2ENDQuno9SLCtFfXUspfQUp61ztUUA80mVL8dTVfbv9HyiEiOjOL_vNMAUdN6oK21Q60xWhdQ6lLjYenbEovZDqUi_GD1G0I0Krxto2aheJYlo4zGdgY49L7EMnnHUb4',
  checkedIn3: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsTPVP-XwL54W1l39RS-feENfDXlg0zTHY-5FtC6UdU_ItLMdt7jzLxVJb4aVWyRT0yoUjLjcW5u0EODmXguVP8xKzdWamj9RgXGI1p_vu3uhkHJ412jmgsZ60BNq_QuODZISk68rDt4DSmS1kxg0L4TazPYT-RnlNi86cU0ohZd8f3rpQoDk-48TUhdJ3R-KNau7o8PzGDAtrkypauY8IlEv9KqVlRE6JtOcHkcWcKJ7bQeNVZqgESid6QXQrXMJ2zhuoDC4rBjYJ',
  checkedIn4: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNmUDHWgA5V4yXlosA-44G9CrTvi_xyejYsh973SwEiTcgJ0qlHqzQ4CMS1bvJrLTModC4v5y_99ZctTerqto7P-ut-nzgd-pmgjPVDeSWGhcTZ_fD5fbitBF364uI3tZmkS1YZ-PmPIQpgCio4iWNj691WkUINQGtmjbW6R-efaURyNJOoOpNf4ElN9EM74peSCjcLatkImv31zEmpzIftWXD8RGbs7xq8V8RrISy5-CJiwKgTWNj8eUZUeiSy1gw8w8JvnJtTfUL',

  // Court Photos
  chaoyangPreview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6esFFf0oQDhArYS5p-Vsj_gkL0eN9rmbmW5ixNpSJBco_mZQn-3JFd0k35J0P5f5t217PR2s7Pj1QF-3WLSlTHfzJjnJvOhNRmeRGwxxVdKFX3ryVNaaUKRMdFqNzogHjDxewYtRRaebiqocsW2HCT7iBehXem7ONl8MLv1Q9KSuFkk8gTXrhBg8BM8xG8aZ5bLHzm9LppYY8C3GrBy3lhRtzkbnCKrxtIgFqI_vp7s29yD5R_c5Zdh8NekmNOeEZb8r8w_8JYUBL',
  chaoyangHero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBS4nBhQ-_y65K8b9wwTCROxDIxZ6NE1TqqmVB3dA3GGGVLPvc02GF7HPHI39GXhlEyJcjvhLLMpoW55nNZ9UKQAM25dTGuhZA12DvKW7pSPMrIqUbkr0mvEJnJqEnSdHXC7hCWL-6i6zoJKxOCqXsvxMXHaCK_OUqSOlBt48R-2GSxMcwNrbxV25l_UxFpbsuXm_Qq9vGX8n5jQQ_DGsqmto28pFMHq2_8pJ1K0RaIwurqQq3zqt5tUZQ66I_beYc0sIBW4_GjzMzo',
  courtCloseup: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaFszgieLqJaPpzVOHQwYX5wMC8_dC57RRfRp81XmOOhFb5I-tYZZkWM9zqs3MQZgqzpryKZkbXBO0GjxNILnYe0n4xFFbOQqLr1MEPQXFcDU-Ud8l5CvnQq9X8dOPv46_ALOQNvDbx4mRaszldMpkODPBYTETXBJ3MMm_TivIROP_mxS0gygdFXbRrq-8v3W42r2GKX6QIzUlqbuTqqoVfaJfwlVdYCf3xrcdty6v11ylaITrfMYyLc5QuHjfmjbkvBvb8BDvgtQ9',
  courtGroup: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnbiISV9oP8TRWl1RPOdy-hWLfJgjiNImyth9sIqHXivLoRR1FVZA6Wb0lrasml11McaB5mJmx_NNafL16qMnoHV480dh7R90-H9faTuLUbcd9fFzzqip6xeQb4YqRRYo4l1l21tAffvPBDgyS4RqRjFjLsGsjKYdD3r25dsLjtXRnwytFU3B2XUi6aGBZLpMEareSNi_tuz-w9Qxau1bdaPgSJMCAZDnI5RicVMCZVFpq9rzL1b5XLhHmCUWzdzScxcUAXm-k0E7X',

  // Reviews
  reviewerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr6KXuSbxenPEbl94rnwtw6qj6PJtY09NhxKMZ9fg5Ro-TWwe3A7qNa9JvFjPRyo-OuzWrG6mHlJ6mMbb5P4px1diqoXBt900473FFt7MwcbOC5qPsUnYZCTThD6GZWk6DPErjZg5f3Hqcq7eFlcTeD974NqUSUdX0aF04uxNjlgwOz_X7kg0fbv8nmVHMPgNfMojHX5EZGOPd9q7Uu4O8sWqzVrjDF8OcCmXFpkgipv8_rifnFAqXrVUKgIRhbUXyyd3P-wcYYuHi',
  reviewBallCloseup: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASynLTHGSbXIC5HE3qPceirWTtPASAxocepR6YDRQP9vQki4TD8KtHQSbM3VICEe-d2pq6lqol4PLPCdrVGbCoOwe6hiUmZF6HtN6zQ8H9On0NJxSuLhm_OuttSouq9JIVdz1dUAGuAi5SkBtNhlLM1P_6yK3oKEXVnEPejjG0CH813Qgk-tmKNOqe6cNSHF6jmUB-ymvRjkZxc1uQ4pJBFtpd45ykUOM5JMFf8XBgJ2GtL-35tZKRPDQ8b4ll3bN0ZFYn5RjElNkP',
  reviewCourtNight: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbQ0_fGtktPBeMOfhUBOj6w1LV9lJ-eSO3HClYn2T4M6_FwxPncIoddWQdRIVYpOZp6VT8pQzVJTQ1iSubu1wbfNhC6wlarXpjOb-j0gofV1tKo7c4BCfdio0vTs3NA5INSbIJ3Jhjn6I0SeIxwQNlV7hcRz1QOkPN2j46jgqr4sTnV7uF9yJFiPImvUlPdJm4EnT4R_KblAi70UY8J9onsyCWe0d_gzW2tV95dNQSfNBjEfDHxOTEB4Wab5gWLV0dX7-5RWFs7ueZ',

  // Opponents for records
  opponentLiMing: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmuSEq1E4PgupaW1TOrrvjl3zrhWwn243KqMGO0JyxK0orNeNPE5pBZCD45VEZn5TEqkNWVU91EdkOY3u5MqovT_kEoW9zsB_D4-TVUHvdUMGDavBrD6x1eR572VbODvpQ_HvV48qGOSlA_TFIbuuADC5wVEC8SheYDhXtwmLtnupG05zPGB-SUiyvq1zHV8zHnSrI5L6W8gbLQKbgnhxsCnY8vwYZ73g1tbZ-2uCmQ-1shQ9adwS3PzGi_Y6LnYoNhqa5HFnWTQrt',
  opponentWangXiaofang: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnPVCHr9dam6rD9U8M-ZR9lIBfXY9RI4qRyJqKyTQPRxl-r03kEgfk5Mtsb4MMGInJgWFcN1oGqywOAy_p-Je_g6-Rxi6KjoDMT97fI5X7tiBA4jWw5aFBY8x5AX9ItxfmPsSPDgpSjtnDTbxCJyj827Ng6R0UajskD1V7JnxQj5UIpXsexBqvwWBPNPZ3tVVAxlPSngVa2XN0Lsd7aVesvqDUFEg3m-87C-XnV_B3vLnYGRCrqBjR-kZljzyfKnwH-Sutn_3nWQwW',
  opponentZhangWei: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDx0JkrZj1yJS-LPxrmOkAzF_ITZ51kuAgXDEes2IG1KSBbMRmRzxnN0IAT8mtxJ2lAZ5VjWUY1QuOVDQyeurVhWWyniDkjmbGRm_aWgFHTQw3iVxflAL-neTP-SFTKVj1IiycbDuFesByTJtBWBSguhnL2YL6EhJExUMs_3md_nHYnigors19xIwGQX1gBdov4RIOKoIq7cwwEbqSgAi3mVPmSR-oYZ7cOpMdbXBSJw1u6Rs-t7H7hBgWDdAa2scc9t6ftHpi8uiRX',

  // Custom icon reviews
  reviewerZhangDayong: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSbehQueHRX8tr_jPQcXUQgzxT5yLaLfjrblclo2gMgBlcUXvNrlU9ExGDxFvEBHOj20GE96alO3OTj5frBzQrm1pztdQA5m3gsY62pPSp1JCIqUYd8UXVnU75L61kEEWiOa16JF7fB94f249GLBWM3xXOIhCTchLtKa9ueMvWW2qUVBBHpEURDENatHPkNGZWiZU_lkYLCXMOJy6ODveIaL4AGMH1ve8kOuct5fPNaaDjF5sVsDJj_g0jUyHgZ4aDhIO6p4dspopZ',
  reviewerLinXiaoping: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4cu4ulJu3wLrwZ4M0aNfBVacqQSK_atNvrjwalwaiwEnEUwlRY4n-fSH38QgygUlxus7WDN9suy0k-M6KwcCj_juFFIHBhEmcHxSOVq-IcKUkF_e0v4MSZfB_4LLybVQhiaBsym1i2lgDufymHYODQZM60zbMX-ldcinKtvsir-FNGe4Kj02ldKAcnPMKITflt4i28131vRFCCQ5H3Tza1avGkQEi98gBPqCRtx3KelKFN_uv_YAg2-XxcnwjAKahi1trQQYtRE0a',
  reviewerLaoLiCoach: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8-pdoi9cuajbszr_rS3DLz1e6uI89WVLxRTHnfI5x9EJkfbwQLR4qfzw5p3KS3AHFszZSB2bykTIYUwvX_CZQKhsoHzz-hBZNbPdhED-Umc3DbQLs2G2PpVS1adK99T1JBklFjjOSUwER0vZ_F8i-z3z9zqg9vSRqxUAWySoD50Ip9zP8bk9in2jNW9KyYiP3gZtyPXOXIjJYkN9PYrP0tZCuQVLQ8D5Isif2hUW2fdE4LpgCrS41N1KxqkjWXVzjXDVPRHDNpOn1'
};

export const INITIAL_MATCH_POSTS: MatchPost[] = [
  {
    id: 'post_1',
    organizerName: '老张',
    organizerAvatar: IMAGES.laoZhangAvatar,
    organizerLevel: 'L3 高级',
    title: '谁来切磋一下？三局两胜',
    locationName: '朝阳公园',
    timeStr: '10分钟后开打',
    joinedCount: 3,
    totalCapacity: 4,
    feeType: 'AA制',
    feeValue: 15,
    description: '水平中等偏上，打完可以一块吹水。红双喜专业球台，提供好球。谁来切磋，三局两胜！',
    status: '招募中',
    participants: [IMAGES.player1, IMAGES.player2, IMAGES.checkedIn1]
  },
  {
    id: 'post_2',
    organizerName: '小李',
    organizerAvatar: IMAGES.xiaoLiAvatar,
    organizerLevel: 'L1 萌新',
    title: '周六早起锻炼，有新手一起吗？',
    locationName: '奥森北园',
    timeStr: '明天 09:00',
    joinedCount: 1,
    totalCapacity: 2,
    feeType: '免费',
    feeValue: 0,
    description: '刚开始学习乒乓球，主要是早起锻炼身体，有新手朋友一块娱乐的吗？男女不限哈！',
    status: '最后1席',
    participants: [IMAGES.player3]
  },
  {
    id: 'post_3',
    organizerName: '王教练',
    organizerAvatar: IMAGES.coachWangAvatar,
    organizerLevel: 'Pro 大神',
    title: '高水平对抗赛，欢迎围观',
    locationName: '五棵松体育馆',
    timeStr: '周日 14:00',
    joinedCount: 4,
    totalCapacity: 4,
    feeType: '付费',
    feeValue: 50,
    description: '本市高水平业余交流赛，全部是由L3/Pro等级组成的局，欢迎围观和指导。包含专业裁判计分。',
    status: '已满员',
    participants: [IMAGES.player1, IMAGES.player2, IMAGES.player3, IMAGES.checkedIn2]
  }
];

export const INITIAL_COURTS: Court[] = [
  {
    id: 'court_1',
    name: '朝阳公园乒乓球场',
    isFree: true,
    activePlayers: 8,
    distanceStr: '1.2km',
    courtCount: 8,
    material: '塑胶',
    hasLighting: true,
    openHours: '06:00-22:00',
    image: IMAGES.chaoyangPreview,
    galleryImages: [IMAGES.chaoyangHero, IMAGES.courtCloseup, IMAGES.courtGroup],
    lat: 38, // map relative percentage coordinates
    lng: 42,
    rating: 4.8,
    address: '北京市朝阳区朝阳公园南路1号',
    features: ['免费开放', '红双喜专业球台', '夜间防眩光照明', '橡胶防护地面', '近便利店'],
    reviews: [
      {
        id: 'rev_1',
        reviewerName: '球场悍将王',
        reviewerAvatar: IMAGES.reviewerAvatar,
        reviewerLevel: 'L3 进阶级别',
        timeStr: '2天前',
        rating: 5,
        content: '这里的塑胶地面维护得非常好，不打滑。球台也都是红双喜的专业台，晚上灯光亮度足够，强烈推荐！',
        images: [IMAGES.reviewBallCloseup, IMAGES.reviewCourtNight]
      },
      {
        id: 'rev_2',
        reviewerName: '张大勇',
        reviewerAvatar: IMAGES.reviewerZhangDayong,
        reviewerLevel: 'L4 Pro',
        timeStr: '2023-11-20',
        rating: 5,
        content: '场地非常专业，胶皮回弹感极佳。灯光分布均匀不刺眼，空调给力，即使是高强度对抗也不会觉得闷热。特别是这里的球桌，都是国际比赛标准的，非常适合练习。',
        images: []
      },
      {
        id: 'rev_3',
        reviewerName: '林小乒',
        reviewerAvatar: IMAGES.reviewerLinXiaoping,
        reviewerLevel: 'L2 Active',
        timeStr: '2023-11-18',
        rating: 4,
        content: '离家很近，交通方便。周末人挺多的，建议提前在小程序预约。工作人员态度很好，帮忙调整了灯光。唯一不足是休息区的座位稍微有点少，高峰期没地方坐。',
        images: []
      }
    ]
  },
  {
    id: 'court_2',
    name: '奥林匹克森林公园球场',
    isFree: true,
    activePlayers: 12,
    distanceStr: '3.5km',
    courtCount: 12,
    material: '水泥防滑',
    hasLighting: false,
    openHours: '06:00-20:00',
    image: IMAGES.courtGroup,
    galleryImages: [IMAGES.courtGroup, IMAGES.courtCloseup],
    lat: 25,
    lng: 60,
    rating: 4.5,
    address: '北京市朝阳区科荟路奥森公园北园内',
    features: ['户外休闲', '免费开放', '绿树环绕', '近洗手间'],
    reviews: [
      {
        id: 'rev_4',
        reviewerName: '老李教练',
        reviewerAvatar: IMAGES.reviewerLaoLiCoach,
        reviewerLevel: 'Coach',
        timeStr: '2023-11-15',
        rating: 5,
        content: '带学员来这里练过几次。红胶地面弹性适中，对膝盖保护很好。球台之间的间距很大，不会互相干扰，非常适合教学和正规比赛。',
        images: []
      }
    ]
  },
  {
    id: 'court_3',
    name: '五棵松乒乓球运动馆',
    isFree: false,
    activePlayers: 24,
    distanceStr: '8.1km',
    courtCount: 16,
    material: '专业运动木地板',
    hasLighting: true,
    openHours: '09:00-22:00',
    image: IMAGES.courtCloseup,
    galleryImages: [IMAGES.courtCloseup, IMAGES.chaoyangHero],
    lat: 65,
    lng: 28,
    rating: 4.9,
    address: '北京市海淀区复兴路69号五棵松体育馆B1层',
    features: ['室内空调', '淋浴更衣', '名牌用球提供', '专业发球机租赁'],
    reviews: []
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  username: '张大圣',
  level: 'L3 高级',
  levelBadge: '乒乓球达人',
  avatarUrl: IMAGES.dashengAvatar,
  hoursPlayed: 120,
  winRate: 65,
  points: 1250,
  achievements: [
    { id: 'ach_1', name: '百日球王', desc: '累计打球达到100小时', icon: 'military_tech', color: 'bg-secondary-fixed text-secondary', unlocked: true },
    { id: 'ach_2', name: '早起达人', desc: '在早上8点前签到10次', icon: 'wb_sunny', color: 'bg-primary-fixed text-primary', unlocked: true },
    { id: 'ach_3', name: '迅捷如风', desc: '连续赢得5场比赛', icon: 'bolt', color: 'bg-tertiary-fixed text-tertiary', unlocked: true },
    { id: 'ach_4', name: '广交球友', desc: '与20名不同的球友切磋', icon: 'groups', color: 'bg-surface-variant text-on-surface-variant', unlocked: false }
  ]
};

export const INITIAL_GAME_RECORDS: GameRecord[] = [
  {
    id: 'rec_1',
    opponentName: '李明',
    opponentLevel: 'L2 进阶',
    opponentAvatar: IMAGES.opponentLiMing,
    matchTime: '2026.06.24 18:30',
    myScore: 3,
    opponentScore: 1,
    isWin: true,
    locationName: '静安体育中心 - 3号台'
  },
  {
    id: 'rec_2',
    opponentName: '王晓芳',
    opponentLevel: 'L3 高级',
    opponentAvatar: IMAGES.opponentWangXiaofang,
    matchTime: '2026.06.22 14:15',
    myScore: 0,
    opponentScore: 3,
    isWin: false,
    locationName: '徐家汇源地球场馆'
  },
  {
    id: 'rec_3',
    opponentName: '张伟',
    opponentLevel: 'L1 萌新',
    opponentAvatar: IMAGES.opponentZhangWei,
    matchTime: '2026.06.20 20:00',
    myScore: 3,
    opponentScore: 2,
    isWin: true,
    locationName: '普陀长风球场'
  }
];

export const INITIAL_CUSTOM_ICONS: CustomIcon[] = [
  {
    id: 'icon_ball_custom',
    name: '火热橙色球',
    dataUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASynLTHGSbXIC5HE3qPceirWTtPASAxocepR6YDRQP9vQki4TD8KtHQSbM3VICEe-d2pq6lqol4PLPCdrVGbCoOwe6hiUmZF6HtN6zQ8H9On0NJxSuLhm_OuttSouq9JIVdz1dUAGuAi5SkBtNhlLM1P_6yK3oKEXVnEPejjG0CH813Qgk-tmKNOqe6cNSHF6jmUB-ymvRjkZxc1uQ4pJBFtpd45ykUOM5JMFf8XBgJ2GtL-35tZKRPDQ8b4ll3bN0ZFYn5RjElNkP',
    type: 'marker',
    fileType: 'image/jpeg',
    fileSize: 18450,
    createdAt: '2026-07-06T12:00:00-07:00'
  },
  {
    id: 'icon_paddle_custom',
    name: '炫酷拍子',
    dataUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaFszgieLqJaPpzVOHQwYX5wMC8_dC57RRfRp81XmOOhFb5I-tYZZkWM9zqs3MQZgqzpryKZkbXBO0GjxNILnYe0n4xFFbOQqLr1MEPQXFcDU-Ud8l5CvnQq9X8dOPv46_ALOQNvDbx4mRaszldMpkODPBYTETXBJ3MMm_TivIROP_mxS0gygdFXbRrq-8v3W42r2GKX6QIzUlqbuTqqoVfaJfwlVdYCf3xrcdty6v11ylaITrfMYyLc5QuHjfmjbkvBvb8BDvgtQ9',
    type: 'marker',
    fileType: 'image/jpeg',
    fileSize: 24300,
    createdAt: '2026-07-06T12:10:00-07:00'
  }
];
