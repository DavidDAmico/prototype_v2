import os
import requests
import time
import helper.database_connector as db

DBNAME = os.getenv('DBNAME')
HOST = os.getenv('DBHOST')
USER = os.getenv('DBUSER')
PASSWORD = os.getenv('DBPASS')
IS_PROD = os.getenv('IS_PROD')
API_URL = os.getenv('API_URL')


def push_file(app, file_path: str, caption: str, file_type: str):
    """
    Function to upload a file to the API with retry logic.
    :param app: Flask app
    :param file_path: Path to the file
    :param caption: Caption for the post
    :param file_type: Type of the file
    :return: State of the request
    """

    # Log the file upload
    app.logger.info(
        f"##push_file## Uploading file {file_path} to {API_URL}... from {os.getcwd()} list {os.listdir('/app')}")

    # Check if file exists
    if not os.path.exists(file_path):
        app.logger.error(f"##push_file## File does not exist: {file_path}")
        return False, {"error": f"File does not exist: {file_path}"}

    # Check if API is running
    check_response = requests.get('http://instagrapi:50123/healthpoint')
    if check_response.status_code != 200:
        app.logger.error(f"##push_file## API is not running")
        return False, {"error": "API is not running"}

    # Retry settings
    max_retries = 3
    retry_delay = 15  # Delay in seconds between retries
    timeout = 20  # Timeout for each request

    # Open file and send it to the API with retries
    for attempt in range(max_retries):
        try:
            with open(file_path, "rb") as file:
                response = requests.post(
                    API_URL,
                    files={"file": file},
                    data={
                        "caption": caption,
                        "file_type": file_type
                    },
                    timeout=timeout
                )

            # Check for successful response
            if response.status_code == 200:
                app.logger.info(f"##push_file## File uploaded successfully on attempt {attempt + 1}")
                return True, response.json()
            else:
                app.logger.warning(
                    f"##push_file## Attempt {attempt + 1} failed with status code "
                    f"{response.status_code} and {response.json().get('error')}")
        except requests.exceptions.RequestException as e:
            app.logger.error(f"##push_file## Error on attempt {attempt + 1}: {e}")

        # Wait before retrying, if there are retries left
        if attempt < max_retries - 1:
            app.logger.info(f"##push_file## Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)

    # If all retries fail
    app.logger.error("##push_file## All attempts to upload the file failed.")
    return False, {"error": "Failed to upload file after multiple attempts"}


def process_data(data):
    """
    :param data: JSON data from the request body
    :return:
    """

    # Extracting data from the JSON
    try:
        upload_datetime = data['metadata']['upload_time']
        file_name = data['metadata']['file_name']
        file_type = data['metadata']['file_type']
        caption = data['metadata']['caption']

        file = data['file']
    except KeyError as e:
        return False, e

    # Setting the upload folder
    upload_folder = os.path.join(os.getcwd(), "file_upload")

    # Creating the upload folder if it does not exist
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    # Saving the file
    if IS_PROD:
        file_path = os.path.join(upload_folder, file_name)
        try:
            with open(file_path, "wb") as f:
                f.write(file.stream.read())
        except Exception as e:
            return False, f"IS_PROD: Error saving file: {e}, {os.getcwd()}"
    else:
        try:
            file_path = os.path.join(upload_folder, file_name)
            with open(file_path, "wb") as f:
                f.write(file.stream.read())
        except Exception as e:
            return False, f"DEV: Error saving file: {e}"

    # Connecting to the database
    try:
        connector = db.DatabaseConnector(
            f'dbname={DBNAME} user={USER} password={PASSWORD} host={HOST}')
        connector.connect()
    except Exception as e:
        return False, e

    # Inserting data into the database
    try:
        query = f"INSERT INTO public.media (upload_datetime, file_name, file_type, caption) VALUES ('{upload_datetime}', '{file_name}', '{file_type}', '{caption}')"
        connector.execute_update(query)
    except Exception as e:
        return False, e

    return True, 'Processing successful'


def get_calendar():
    """
    :return: State of request
    """
    # Connecting to the database
    # TODO: We have to add the images/videos to the response
    try:
        connector = db.DatabaseConnector(
            f'dbname={DBNAME} user={USER} password={PASSWORD} host={HOST}')
        connector.connect()
    except Exception as e:
        return False, e

    # Querying the database
    try:
        query = "SELECT * FROM public.media"
        data = connector.execute_query(query)
    except Exception as e:
        return False, e

    return True, data