"""Unit tests for the vec0 vector store wrapper (Phase 1a)."""

import math

import pytest
import sqlite3

from app.core.vector_store import CHUNKS_LOCAL, CHUNKS_NV, Vec0Store

DIM = 384


def unit(dim: int, at: int = 0) -> list:
    """Unit vector of ``dim`` dimensions with a 1.0 at position ``at``."""
    v = [0.0] * dim
    v[at] = 1.0
    return v


@pytest.fixture
def conn(tmp_path):
    db = sqlite3.connect(tmp_path / "vec_test.db")
    yield db
    db.close()


@pytest.fixture
def store(conn):
    Vec0Store.create_tables(conn)
    return Vec0Store(conn)


class TestNormalization:
    def test_normalizes_to_unit_length(self):
        v = Vec0Store.normalize([3.0, 4.0])
        assert math.isclose(v[0], 0.6, abs_tol=1e-6)
        assert math.isclose(v[1], 0.8, abs_tol=1e-6)

    def test_zero_vector_raises(self):
        with pytest.raises(ValueError):
            Vec0Store.normalize([0.0, 0.0, 0.0])


class TestCreateTables:
    def test_both_dimension_tables_created(self, conn):
        Vec0Store.create_tables(conn)
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        names = {r[0] for r in rows}
        assert CHUNKS_NV in names
        assert CHUNKS_LOCAL in names


class TestInsertQuery:
    def test_knn_ranks_closest_first(self, store):
        store.insert(CHUNKS_LOCAL, content="a", embedding=unit(DIM, 0), document_id=1, chunk_index=0)
        store.insert(CHUNKS_LOCAL, content="b", embedding=unit(DIM, 1), document_id=2, chunk_index=0)
        query = [0.95, 0.05] + [0.0] * (DIM - 2)
        results = store.query(CHUNKS_LOCAL, embedding=query, k=2)
        assert results[0]["content"] == "a"
        assert results[1]["content"] == "b"
        assert "distance" in results[0]

    def test_query_returns_metadata(self, store):
        store.insert(CHUNKS_LOCAL, content="hello", embedding=unit(DIM, 0), document_id=7, chunk_index=3)
        results = store.query(CHUNKS_LOCAL, embedding=unit(DIM, 0), k=1)
        assert results[0]["document_id"] == 7
        assert results[0]["chunk_index"] == 3
        assert results[0]["content"] == "hello"

    def test_384_and_1024_tables_are_independent(self, store):
        store.insert(CHUNKS_LOCAL, content="local", embedding=unit(384, 0), document_id=1, chunk_index=0)
        store.insert(CHUNKS_NV, content="nv", embedding=unit(1024, 0), document_id=1, chunk_index=0)
        local = store.query(CHUNKS_LOCAL, embedding=unit(384, 0), k=5)
        nv = store.query(CHUNKS_NV, embedding=unit(1024, 0), k=5)
        assert len(local) == 1 and local[0]["content"] == "local"
        assert len(nv) == 1 and nv[0]["content"] == "nv"

    def test_dimension_mismatch_raises(self, store):
        store.insert(CHUNKS_LOCAL, content="a", embedding=unit(384, 0), document_id=1, chunk_index=0)
        with pytest.raises(sqlite3.OperationalError):
            store.query(CHUNKS_LOCAL, embedding=unit(383, 0), k=5)

    def test_empty_table_returns_empty(self, store):
        assert store.query(CHUNKS_LOCAL, embedding=unit(384, 0), k=5) == []

    def test_count(self, store):
        store.insert(CHUNKS_LOCAL, content="a", embedding=unit(384, 0), document_id=1, chunk_index=0)
        store.insert(CHUNKS_LOCAL, content="b", embedding=unit(384, 1), document_id=1, chunk_index=1)
        assert store.count(CHUNKS_LOCAL) == 2

    def test_delete_by_document(self, store):
        store.insert(CHUNKS_LOCAL, content="a", embedding=unit(384, 0), document_id=1, chunk_index=0)
        store.insert(CHUNKS_LOCAL, content="b", embedding=unit(384, 1), document_id=2, chunk_index=0)
        store.delete_by_document(CHUNKS_LOCAL, document_id=1)
        assert store.count(CHUNKS_LOCAL) == 1

    def test_invalid_table_name_rejected(self, store):
        with pytest.raises(ValueError):
            store.insert("chunks_evil; DROP TABLE documents", content="x", embedding=unit(384, 0), document_id=1, chunk_index=0)
