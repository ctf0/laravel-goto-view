based on https://github.com/codingyu/laravel-goto-view but with better api

## Features

[![md](https://user-images.githubusercontent.com/7388088/104228433-87112a80-5453-11eb-9817-28fed35fd077.png)](https://user-images.githubusercontent.com/7388088/104228433-87112a80-5453-11eb-9817-28fed35fd077.png)

- create view if not found
- append a default value to the newly created file
- copy file path
- open file path
- show files with similar content via codelens
- code lenses

### laravel-modules

i recently started using [laravel-modules](https://nwidart.com/laravel-modules/v6/installation-and-setup) & manual navigation is just impossible,

so for the package to work correctly, make sure u r following the nameing convention of `Pascal > Snake` ex.

> + `module namespace` > `MyDashboard`
> + `view namespace` > `my_dashboard`
