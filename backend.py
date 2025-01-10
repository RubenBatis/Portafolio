#	The delirium archive is a digital art portfolio application, currently designed
#	for individual use but with potential to support multiple users in the future. 
#    Copyright (C) 2024 Rubén Bautista Reyes
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
#	 You can contact the author via email: RubenBatis@gmail.com


from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import json

app = Flask(__name__)
MEDIA_DIR = '/static/media'

@app.route('/static/media/<path:subdir>', methods=['GET'])
def list_directory(subdir):
    directory = os.path.join('static', 'media', subdir)

    if os.path.isdir(directory):
        # Devuelve una lista de archivos en el directorio
        try:
            files = os.listdir(directory)
            return jsonify(files), 200
        except Exception as e:
            return jsonify({'error': f'No se pudo listar el directorio: {str(e)}'}), 500
    else:
        # Si no es un directorio, intenta servir como archivo
        return send_from_directory('static/media', subdir)

@app.route('/')
def index():
    return render_template('index.html')


@app.route(f'/{MEDIA_DIR}/', methods=['GET'])
def list_media():
    sub_path = os.path.join(MEDIA_DIR, request.args.get('path', '').lstrip('/'))
    if os.path.isdir(sub_path):
        try:
            files = [f for f in os.listdir(sub_path) if f.endswith('.json') and os.path.isfile(os.path.join(sub_path, f))]
            return jsonify(files), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Not a directory'}), 400


@app.route(f'/{MEDIA_DIR}/', methods=['POST'])
def update_media():
    data = request.json
    media_id = data.get('mediaId')
    updated_config = data.get('config')
    media_file_path = os.path.join(MEDIA_DIR, f'{media_id}.json')
    try:
        if os.path.exists(media_file_path):
            with open(media_file_path, 'r', encoding='utf-8') as file:
                media_data = json.load(file)
            media_data.update(updated_config)
            with open(media_file_path, 'w', encoding='utf-8') as file:
                json.dump(media_data, file, indent=4)
            return jsonify({'status': 'success'}), 200
        return jsonify({'error': 'Medio no encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=12486, debug=True)