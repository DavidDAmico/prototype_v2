from flask_cors import cross_origin, CORS
from flask import Flask, make_response, jsonify, request
import json

import helper.file_handling as file_handling

class FlaskServer:
    """
    Class to create a Flask server and define the endpoints
    Takes care of the healthpoint and upload endpoints, additionally handles the CORS policy and
    the response to the request. The upload endpoint processes the data and calls the process_data function.
    """
    app = Flask('Instagram_uploader')
    CORS(app)

    @staticmethod
    def get_app():
        return FlaskServer.app

    @staticmethod
    @cross_origin('*')
    @app.route('/healthpoint', methods=['GET'])
    def healthpoint():
        return make_response(jsonify("API is running"), 200)

    @staticmethod
    @cross_origin('*')
    @app.route('/upload', methods=['POST'])
    def upload_file():
        """
        Input body:
        e.g.
        {
            metadata: {
                upload_time: "2021-10-01T12:00:00",
                file_name: "example.jpg",
                file_type: "image",
                caption: "This is an example image"
            },
            file: file
        }
        :return: State of request
        """
        try:
            # Metadaten auslesen und parsen
            metadata_json = request.form.get('metadata')
            metadata = json.loads(metadata_json)

            # Datei auslesen
            uploaded_file = request.files.get('file')
            if not metadata_json or not uploaded_file:
                return make_response(jsonify("Missing metadata or file"), 400)

            data = {
                "metadata": metadata,
                "file_name": uploaded_file.filename,
                "file_content_type": uploaded_file.content_type,
                "file": uploaded_file,
            }

            flag, description = file_handling.process_data(data)

            if flag:
                return make_response(jsonify(description), 200)
            else:
                return make_response(jsonify({"error": str(description)}), 400)

        except Exception as e:
            return make_response(jsonify({"error": str(e)}), 500)

    @staticmethod
    @cross_origin('*')
    @app.route('/calendar', methods=['GET'])
    def calendar():
        """
        :return: State of request
        """
        try:
            flag, data = file_handling.get_calendar()
            return make_response(jsonify(data), 200)
        except Exception as e:
            return make_response(jsonify({"error": str(e)}), 500)