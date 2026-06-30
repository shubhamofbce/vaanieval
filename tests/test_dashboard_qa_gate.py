from app.api.v1.dashboard import _is_qa_pass


def test_qa_pass_threshold_boundaries() -> None:
    assert not _is_qa_pass([])
    assert not _is_qa_pass([59, 80, 80, 80])
    assert not _is_qa_pass([60, 79, 80, 100])
    assert _is_qa_pass([60, 80, 80, 100])


def test_low_metric_blocks_high_average() -> None:
    assert not _is_qa_pass([59, 100, 100, 100])
