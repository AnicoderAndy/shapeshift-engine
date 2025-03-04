cmake_minimum_required(VERSION 3.15.0 FATAL_ERROR)

project(ccanvas
        LANGUAGES CXX
        VERSION 0.0.0
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

message(STATUS "CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE}")

set(EXECUTABLE_NAME "ccanvas")

find_package(CGAL CONFIG REQUIRED)
find_package(Crow CONFIG REQUIRED)

include_directories(src)
aux_source_directory(src SRC_FILES)

add_executable(${EXECUTABLE_NAME} main.cpp ${SRC_FILES})

target_link_libraries(${EXECUTABLE_NAME} PRIVATE CGAL::CGAL)
target_link_libraries(${EXECUTABLE_NAME} PUBLIC Crow::Crow asio::asio)