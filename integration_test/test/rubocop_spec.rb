require "yaml"
require "test/helper"

describe "Rubocop" do
    it "exists" do
        _(File.file?(".rubocop.yml")).must_match true
    end
end