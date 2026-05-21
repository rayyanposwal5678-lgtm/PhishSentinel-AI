import pandas as pd
import glob
import os

print("Analyzing Dataset Label Formats...")

files = glob.glob('dataset/*.csv')
for file in files:
    try:
        df = pd.read_csv(file, nrows=5)
        fname = os.path.basename(file)
        if 'label' in df.columns:
            print(f"{fname} -> 'label': {df['label'].values.tolist()}")
        elif 'Email Type' in df.columns:
            print(f"{fname} -> 'Email Type': {df['Email Type'].values.tolist()}")
        else:
            print(f"{fname} -> NO KNOWN LABEL COLUMN. Columns: {df.columns.tolist()}")
    except Exception as e:
        print(f"Error reading {file}: {e}")
