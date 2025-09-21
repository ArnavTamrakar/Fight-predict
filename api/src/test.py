import requests
import json

url = "http://localhost:8000/predict"
data ={
  "features" : [
    # Fighter 1 (Alexandre F) base features
    0.50,    # f1_sig_strike_per (50% significant strike accuracy)
    4.36,    # f1_sig_strike_total (4.36 strikes landed per minute)
    0.56,    # f2_sig_strike_per (56% significant strike accuracy)
    8.86,    # f2_sig_strike_total (8.86 strikes landed per minute)
    2.8,     # f1_td_attempt (2.8 takedown attempts per 15 min)
    1.316,   # f1_td_succeed (2.8 * 0.47 = 1.316)
    0.85,    # f2_td_attempt (0.85 takedown attempts per 15 min)
    0.536,   # f2_td_succeed (0.85 * 0.63 = 0.536)
    2.8,     # tdAvg_f1 (2.8 average takedowns per 15 min)
    0.69,    # tdDef_f1 (69% takedown defense)
    0.85,    # tdAvg_f2 (0.85 average takedowns per 15 min)
    0.81,    # tdDef_f2 (81% takedown defense)
    125,     # weight_f1 (125 lbs)
    125,     # weight_f2 (125 lbs)
    33.4,    # f1_age_when_fight (calculated from Apr 16 1990)
    22.2,    # f2_age_when_fight (calculated from Oct 10 2001)
    30,      # win_f1 (30 wins)
    5,       # lose_f1 (5 losses)
    0,       # draw_f1 (0 draws)
    0,       # nc_f1 (0 no contests)
    15,      # win_f2 (15 wins)
    2,       # lose_f2 (2 losses)
    0,       # draw_f2 (0 draws)
    0,       # nc_f2 (0 no contests)
    
    # Engineered features
    -0.06,   # sig_strike_per_diff (50% - 56% = -6%)
    0.47,    # td_success_rate_f1 (47% takedown success rate)
    0.63,    # td_success_rate_f2 (63% takedown success rate)
    -0.16,   # td_success_rate_diff (47% - 63% = -16%)
    11.2,    # age_diff (33.4 - 22.2 = 11.2 years)
    0.0,     # weight_diff (125 - 125 = 0)
    2.0,     # reach_diff (67 - 65 = 2 inches)
    0,       # stance_matchup (both Orthodox = 0)
    -0.12    # td_def_diff (69% - 81% = -12%)
]
}

response = requests.post(url, json=data)
print(response.status_code)
print(response.json())