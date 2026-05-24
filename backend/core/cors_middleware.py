from django.http import HttpResponse

class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = "https://driveshare-phi.vercel.app"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        response = self.get_response(request)
        response["Access-Control-Allow-Origin"] = "https://driveshare-phi.vercel.app"
        response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With"
        response["Access-Control-Allow-Credentials"] = "true"
        return response