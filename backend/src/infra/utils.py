import os


def get_html_template_file(template_name: str):
    script_directory = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_directory)
    template_dir = os.path.join(root_dir, "data")
    template_file_path = os.path.join(template_dir, template_name)

    with open(template_file_path, "r", encoding="utf-8") as template_file:
        html_template = template_file.read()
    return html_template


def fill_template(template: str, content: dict[str, str]) -> str:
    for key, value in content.items():
        template = template.replace(f"${{{key}}}", value)
    return template
