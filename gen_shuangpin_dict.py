import pypinyin
SHENGMU_DIC = {
    "zh": "v", 
    "ch": "i",
    "sh": "u"
}

INPUT_PATH = "pinyin_search.dict.txt"
OUTPUT_PATH = "shuangpin_search.dict.txt"

# DATA_ROOT_PATH = r"C:\temp\test_obsidian_plugin\.obsidian\plugins\obsidian-vimrc-support"
# import os
# INPUT_PATH = os.path.join(DATA_ROOT_PATH, INPUT_PATH)
# OUTPUT_PATH = os.path.join(DATA_ROOT_PATH, OUTPUT_PATH)
meet_first_chinese_char = False
with open(OUTPUT_PATH, "w", encoding="utf-8") as out_f:
    for line in open(INPUT_PATH, encoding="utf-8"):
        if line.startswith("的"):
            meet_first_chinese_char = True
        if not meet_first_chinese_char:
            out_f.write(line)
        else:
            ch = line[0]
            shengmu_set = set()
            for pinyin in pypinyin.pinyin(ch, style=pypinyin.Style.TONE3, heteronym=True)[0]:
                if pinyin[0] in ('a', 'e', 'o'):
                    shengmu = 'o'
                elif pinyin[:2] in SHENGMU_DIC:
                    shengmu = SHENGMU_DIC[pinyin[:2]]
                else:
                    shengmu = pinyin[0]
                shengmu_set.add(shengmu)
            shengmu_str = "".join(shengmu_set)
            out_f.write(f"{ch} {shengmu_str}\n")