from flask import Flask, request, jsonify, send_file
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
import io
import base64
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/login.html')
def login():
    return send_file('login.html')

# DataFrame awal
saldo_awal = 1000000

# ===== Fungsi dasar =====
def hitung_saldo(df):
    saldo = saldo_awal
    saldos = []
    for _, row in df.iterrows():
        if row["Jenis"] == "Pemasukan":
            saldo += row["Biaya"]
        else:
            saldo -= row["Biaya"]
        saldos.append(saldo)
    df["Saldo"] = saldos
    return df

def update_model(df):
    if len(df) > 1:
        # encode kolom Jenis
        le = LabelEncoder()
        df["Jenis_enc"] = le.fit_transform(df["Jenis"])

        # ambil fitur lebih banyak
        fitur = df[["Biaya", "Saldo", "Jenis_enc"]]

        # scaling biar lebih seimbang
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(fitur)

        # Isolation Forest
        model = IsolationForest(
            contamination=0.05,  # bisa diatur sesuai proporsi anomali
            n_estimators=200,
            random_state=42
        )
        hasil = model.fit_predict(X_scaled)
        df["Anomali"] = [0 if h == 1 else 1 for h in hasil]  # 0 normal, 1 anomali
    else:
        df["Anomali"] = 0
    return df

def generate_plot(df):
    plt.close("all")
    plt.figure(figsize=(8,5))
    colors = df["Anomali"].map({0:"green", 1:"red"})
    plt.scatter(df.index, df["Biaya"], c=colors)
    plt.title("Scatter Biaya (hijau=normal, merah=anomali)")
    plt.xlabel("Index")
    plt.ylabel("Biaya")
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    return buf

def evaluasi_model(df):
    if "Aktual" not in df.columns or df["Aktual"].isnull().all():
        return "Kolom 'Aktual' kosong. Tambahkan label aktual (0=normal, 1=anomali)."
    y_true = df["Aktual"].fillna(0).astype(int)
    y_pred = df["Anomali"].astype(int)
    cm = confusion_matrix(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    result = f"=== Confusion Matrix ===\n{cm}\n\nPrecision : {round(precision, 2)}\nRecall    : {round(recall, 2)}\nF1-Score  : {round(f1, 2)}"
    return result

@app.route('/analytics', methods=['POST'])
def analytics():
    data = request.json
    transactions = data.get('transactions', [])
    if not transactions:
        return jsonify({'error': 'No transactions provided'})

    df = pd.DataFrame(transactions)
    # Map jenis
    df['Jenis'] = df['jenis'].map({'pemasukan': 'Pemasukan', 'pengeluaran': 'Pengeluaran'})
    df['Biaya'] = df['jumlah']
    df['Tanggal'] = pd.to_datetime(df['tanggal'])
    df = df.sort_values(by="Tanggal", ignore_index=True)
    df = hitung_saldo(df)
    df = update_model(df)

    # Generate plot
    buf = generate_plot(df)
    plot_data = base64.b64encode(buf.getvalue()).decode('utf-8')

    # Table HTML
    html_table = df.to_html(index=False)
    scrollable = f"""
    <div style="max-height:300px; overflow-y:scroll; border:1px solid #ccc; padding:5px">
        {html_table}
    </div>
    """

    # Evaluation
    eval_result = evaluasi_model(df)

    saldo_terakhir = df['Saldo'].iloc[-1] if not df.empty else saldo_awal

    return jsonify({
        'plot': plot_data,
        'table': scrollable,
        'evaluation': eval_result,
        'saldo_terakhir': saldo_terakhir
    })

if __name__ == '__main__':
    app.run(debug=True)
