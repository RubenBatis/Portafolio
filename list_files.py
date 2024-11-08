import os
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/models':
            try:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                models_dir = 'models'
                files = os.listdir(models_dir)
                model_files = [f for f in files if f.endswith(('.json'))]
                # Codificar los nombres de archivo en UTF-8
                model_files_utf8 = [f.encode('utf-8').decode('utf-8') for f in model_files]
                self.wfile.write(json.dumps(model_files_utf8).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_message = {'error': str(e)}
                self.wfile.write(json.dumps(error_message).encode())
        elif self.path == '/':
            self.path = '/index.html'
            return super().do_GET()
        else:
            return super().do_GET()
            
    def do_POST(self):
        if self.path == '/models':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Parsear los datos recibidos
                data = json.loads(post_data.decode())
                model_id = data.get('modelId')
                updated_config = data.get('config')
                
                # Ruta al archivo JSON del modelo
                model_file_path = os.path.join('models', f'{model_id}.json')
                
                # Leer el archivo JSON actual
                if os.path.exists(model_file_path):
                    with open(model_file_path, 'r', encoding='utf-8') as file:
                        model_data = json.load(file)
                    
                    # Actualizar el archivo con los nuevos valores de configuración
                    model_data.update(updated_config)
                    
                    # Guardar los cambios en el archivo
                    with open(model_file_path, 'w', encoding='utf-8') as file:
                        json.dump(model_data, file, indent=4)
                    
                    # Responder que la actualización fue exitosa
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode())
                else:
                    # Manejar caso en que el archivo JSON no exista
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Modelo no encontrado'}).encode())
            except Exception as e:
                # Manejo de errores al procesar la solicitud
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())

    #def log_message(self, format, *args):
        #return  # Sobrescribir para desactivar el registro de mensajes en la consola

if __name__ == '__main__':
    PORT = 12486
    server = HTTPServer(('localhost', PORT), CustomHandler)
    print(f'Server running on http://localhost:{PORT}')
    server.serve_forever()