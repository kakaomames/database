import os
import requests
import base64
import json
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_USER = "kakaomames"
GITHUB_REPO = "database"

# MIMEタイプからファイル拡張子をマッピングする辞書
# 必要に応じてこのマッピングを拡張できます
MIME_TO_EXT = {
    'application/json': 'json',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'application/javascript': 'js',
    'text/x-c++src': 'cpp',
    'text/x-csrc': 'c',
    'application/x-sh': 'sh'
}

@app.route('/post-data', methods=['POST'])
def post_data():
    """POSTリクエストを受け付け、GitHubにファイルを保存するエンドポイント"""
    if not GITHUB_TOKEN:
        return jsonify({"error": "GitHub token not found."}), 500

    # `Content-Type`ヘッダーからデータの種類を取得
    content_type = request.headers.get('Content-Type', 'text/plain')
    
    # フォームデータからファイルパスの情報を取得
    project_name = request.form.get("project_name")
    user_name = request.form.get("user_name")
    directory = request.form.get("directory")
    
    if not all([project_name, user_name, directory]):
        return jsonify({"error": "Missing project, user, or directory name."}), 400

    # データを取得し、ファイル形式を決定
    if 'application/json' in content_type:
        # JSONの場合、フォームのテキストエリアからデータを取得し、パースする
        try:
            raw_data = request.form.get("data", "")
            data_content = json.loads(raw_data)
            content_bytes = json.dumps(data_content, ensure_ascii=False).encode('utf-8')
            file_extension = MIME_TO_EXT.get(content_type, 'json')
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON format for 'data' field."}), 400
    else:
        # JSON以外の場合、フォームのテキストエリアから文字列データをそのまま取得
        raw_data = request.form.get("data", "")
        content_bytes = raw_data.encode('utf-8')
        file_extension = MIME_TO_EXT.get(content_type, 'txt') # デフォルトはtxt

    encoded_content = base64.b64encode(content_bytes).decode('utf-8')
    file_path = f"data/{project_name}/{user_name}/{directory}.{file_extension}"
    
    github_api_url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{file_path}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    request_body = {
        "message": f"Add or update {file_extension} file for {project_name}/{user_name}",
        "content": encoded_content
    }

    try:
        response = requests.put(github_api_url, headers=headers, json=request_body)
        response.raise_for_status()
        
        return jsonify({
            "message": "File successfully saved to GitHub.",
            "file_url": response.json()["content"]["html_url"],
            "file_type": file_extension
        }), 201

    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"GitHub API error: {e.response.json().get('message', str(e))}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    if not os.path.exists('templates'):
        os.makedirs('templates')
    app.run(debug=True)
