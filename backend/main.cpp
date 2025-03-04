#include <crow.h>
#include <CGAL/Simple_cartesian.h>

typedef CGAL::Simple_cartesian<int> Kernel;
typedef Kernel::Point_2 Point_2;

int main() {
    crow::SimpleApp app;

    Point_2 p(1, 1);

    CROW_ROUTE(app, "/")
    ([&]() {
        crow::json::wvalue msg({{"x", p.x()}, {"y", p.y()}, {"msg", "Hello, CGAL!"}});
        crow::response res(msg);
        res.add_header("Access-Control-Allow-Origin", "*");
        return res;
    });

    app.port(8081).multithreaded().run();
}