export const styles = new Map()

styles.set('project_title', c => c.underline)
styles.set('underline', c => c.underline)
styles.set('test_file_url_dirname', c => c.keyword("gray"))
styles.set('gray', c => c.keyword("gray"))
styles.set('smooth_accent_color', c => c.rgb(0xe9, 0xc4, 0x6a))
styles.set('pass_color', c => c.rgb(0x2a, 0x9d, 0x8f))
styles.set('fail_color', c => c.rgb(0xe7, 0x6f, 0x51))
styles.set('darker_fail_color', c => c.rgb(0xce, 0x40, 0x1c))
styles.set('test_file_url_filename', c => c.keyword("whitesmoke"))
styles.set('test_file_pass', c => c.keyword("black").bgRgb(0x2a, 0x9d, 0x8f))
styles.set('test_file_fail', c => c.keyword("black").bgRgb(0xe7, 0x6f, 0x51))
styles.set('test_file_runs', c => c.keyword("black").bgRgb(0xe9, 0xc4, 0x6a))
styles.set('sub_test_pass', c => c.rgb(0x2a, 0x9d, 0x8f))
styles.set('sub_test_fail', c => c.rgb(0xe7, 0x6f, 0x51))
styles.set('assertion_icon_pass_todo', c => c.rgb(0xf4, 0xa2, 0x61))
styles.set('assertion_icon_pass', c => c.rgb(0x2a, 0x9d, 0x8f))
styles.set('assertion_icon_fail', c => c.rgb(0xe7, 0x6f, 0x51))
styles.set('assertion_name', c => c.rgb(0xe9, 0xc4, 0x6a))
styles.set('assertion_source_line', c => c.rgb(0xe9, 0xc4, 0x6a))
styles.set('assertion_description', c => c.keyword("whitesmoke"))
styles.set('log_message_icon', c => c.rgb(0xf4, 0xa2, 0x61))
styles.set('log_message_error', c => c.bgRgb(0xe7, 0x6f, 0x51).keyword("black"))
styles.set('log_message_warn', c => c.bgRgb(0xf4, 0xa2, 0x61).keyword("black"))
styles.set('log_message_log', c => c.bgRgb(0xe9, 0xc4, 0x6a).keyword("black"))
styles.set('log_message_debug', c => c.bgRgb(0x2a, 0x9d, 0x8f).keyword("black"))
styles.set('log_message_info', c => c.bgRgb(0x26, 0x46, 0x53).keyword("black"))
styles.set('exception_icon', c => c.bgRgb(0xe7, 0x6f, 0x51).keyword("black"))
styles.set('difference_key_path', c => c.keyword("whitesmoke"))
styles.set('summary', c => c.keyword("whitesmoke"))
styles.set('summary_tests_passed', c => c.rgb(0x2a, 0x9d, 0x8f))
styles.set('summary_tests_failed', c => c.rgb(0xe7, 0x6f, 0x51))
styles.set('progress_bar_completed_passed', c => c.bgRgb(0x20, 0x76, 0x6b))
styles.set('progress_bar_completed_failed', c => c.bgRgb(0xce, 0x40, 0x1c))
styles.set('ligther_smooth_accent_color', c => c.rgb(0xef, 0xd3, 0x8f))
styles.set('typename', c => c.rgb(0xe9, 0xc4, 0x6a))
styles.set('tree_line', c => c.rgb(0x40, 0x40, 0x40))
styles.set('accented', c => c.keyword("whitesmoke"))
styles.set('accented_value', c => c.rgb(0xef, 0xd3, 0x8f))
styles.set('deccented', c => c.rgb(0x26, 0x46, 0x53))
styles.set('option_name', c => c.keyword("whitesmoke"))
styles.set('option_group_name', c => c.rgb(0x2a, 0x9d, 0x8f))