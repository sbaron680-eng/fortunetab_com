from datetime import datetime
from typing import Optional


HeavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
EarthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

AnimalSigns = {
    "子": "쥐", "丑": "소", "寅": "호랑이", "卯": "토끼", 
    "辰": "용", "巳": "뱀", "午": "말", "未": "양", 
    "申": "원숭이", "酉": "닭", "戌": "개", "亥": "돼지"
}

FiveElements = {
    "甲": "목", "乙": "목", "丙": "화", "丁": "화", "戊": "토", 
    "己": "토", "庚": "금", "辛": "금", "壬": "수", "癸": "수"
}

BranchElements = {
    "子": "수", "丑": "토", "寅": "목", "卯": "목", "辰": "토", 
    "巳": "화", "午": "화", "未": "토", "申": "금", "酉": "금", 
    "戌": "토", "亥": "수"
}


def get_stem_index(year: int) -> int:
    return (year - 4) % 10


def get_branch_index(year: int) -> int:
    return (year - 4) % 12


def get_month_branch(year: int, month: int) -> int:
    start_month = (get_branch_index(year) * 2 + 2) % 12
    return (start_month + month - 1) % 12


def get_day_branch(day: int) -> int:
    return (day + 2) % 12


def get_time_branch(hour: int) -> int:
    return (hour + 1) // 2 % 12


def parse_saju(birth_year: int, birth_month: int, birth_day: int, birth_hour: int) -> dict:
    year_branch_idx = get_branch_index(birth_year)
    year_stem_idx = get_stem_index(birth_year)
    
    month_branch_idx = get_month_branch(birth_year, birth_month)
    month_stem_idx = (year_stem_idx * 2 + birth_month) % 10
    
    day_branch_idx = get_day_branch(birth_day)
    day_stem_idx = (day_branch_idx * 2 + birth_day) % 10
    
    time_branch_idx = get_time_branch(birth_hour)
    time_stem_idx = (day_stem_idx * 2 + birth_hour // 2 + 1) % 10
    
    return {
        "year": HeavenlyStems[year_stem_idx] + EarthlyBranches[year_branch_idx],
        "month": HeavenlyStems[month_stem_idx] + EarthlyBranches[month_branch_idx],
        "day": HeavenlyStems[day_stem_idx] + EarthlyBranches[day_branch_idx],
        "time": HeavenlyStems[time_stem_idx] + EarthlyBranches[time_branch_idx],
        "elements": {
            "year": FiveElements[HeavenlyStems[year_stem_idx]],
            "month": FiveElements[HeavenlyStems[month_stem_idx]],
            "day": FiveElements[HeavenlyStems[day_stem_idx]],
            "time": FiveElements[HeavenlyStems[time_stem_idx]]
        },
        "animal": AnimalSigns[EarthlyBranches[year_branch_idx]],
        "year_branch": EarthlyBranches[year_branch_idx],
        "month_branch": EarthlyBranches[month_branch_idx],
        "day_branch": EarthlyBranches[day_branch_idx],
        "time_branch": EarthlyBranches[time_branch_idx]
    }


def get_element_balance(saju: dict) -> dict:
    elements = list(saju["elements"].values())
    counts = {"목": elements.count("목"), "화": elements.count("화"), "토": elements.count("토"), "금": elements.count("금"), "수": elements.count("수")}
    return counts


def get_day_master(saju: dict) -> str:
    return saju["day"][0]


def format_saju_for_ai(saju: dict) -> str:
    return f"""
년주(年柱): {saju['year']} ({saju['animal']})
월주(月柱): {saju['month']}
일주(日柱): {saju['day']}
시주(時柱): {saju['time']}

오행 구성: {saju['elements']}
"""


if __name__ == "__main__":
    test = parse_saju(1990, 5, 15, 14)
    print(format_saju_for_ai(test))