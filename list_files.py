import os
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, models_dir='models', **kwargs):
        self.models_dir = models_dir
        super().__init__(*args, **kwargs)

    def send_message(self, code, message=None):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        if message:
            self.wfile.write(json.dumps(message).encode())

    def do_GET(self):
        if self.path == f'/{self.models_dir}' or self.path.startswith(f'/{self.models_dir}/'):
            try:
                sub_path = os.path.join(self.models_dir, self.path.lstrip(f'/{self.models_dir}'))
                if os.path.isdir(sub_path):
                    # Es un directorio: lista los archivos JSON
                    files = os.listdir(sub_path)
                    model_files = [f for f in files if f.endswith('.json') and os.path.isfile(os.path.join(sub_path, f))]
                    self.send_message(200, model_files)
                else:
                    # No es un directorio: delegar al manejador base
                    return super().do_GET()
            except Exception as e:
                # Manejo de errores
                print(f"Error en subdirectorio: {e}, en {self.path}")
                self.send_message(500, {'error': str(e)})
        elif self.path == '/':
            # Sirve el archivo index.html directamente sin redirigir
            self.path = '/index.html'
            return super().do_GET()
        else:
            return super().do_GET()

    def do_POST(self):
        if self.path == f'/{self.models_dir}' or self.path.startswith(f'/{self.models_dir}/'):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Parsear los datos recibidos
                data = json.loads(post_data.decode())
                model_id = data.get('modelId')
                updated_config = data.get('config')
                
                # Ruta al archivo JSON del modelo
                model_file_path = os.path.join(self.models_dir, f'{model_id}.json')
                
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
                    self.send_message(200, {'status': 'success'})
                else:
                    # Manejar caso en que el archivo JSON no exista
                    self.send_message(404, {'error': 'Modelo no encontrado'})
            except Exception as e:
                # Manejo de errores al procesar la solicitud
                print(f"Error {e} in POST {self.path}")
                self.send_message(500, {'error': str(e)})

    #def log_message(self, format, *args):
        #return  # Sobrescribir para desactivar el registro de mensajes en la consola

if __name__ == '__main__':
    PORT = 12486
    models_directory = 'models'  # Puedes cambiar esta ruta según sea necesario
    server = HTTPServer(('localhost', PORT), lambda *args, **kwargs: CustomHandler(*args, models_dir=models_directory, **kwargs))
    print(f'Server running on http://localhost:{PORT}')
    server.serve_forever()
